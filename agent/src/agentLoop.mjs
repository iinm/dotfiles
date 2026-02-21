/**
 * @import { AgentEventEmitter } from "./agent"
 * @import { CallModel, Message, MessageContentText, MessageContentImage, MessageContentToolResult, MessageContentToolUse, PartialMessageContent } from "./model"
 * @import { Tool, ToolDefinition, ToolUseApprover } from "./tool"
 * @import { SubagentManager } from "./subagentManager.mjs"
 */

import { styleText } from "node:util";
import { delegateToSubagentTool } from "./tools/delegateToSubagent.mjs";
import { reportAsSubagentTool } from "./tools/reportAsSubagent.mjs";
import { validateToolUse } from "./toolValidation.mjs";
import { consumeInterruptMessage } from "./utils/consumeInterruptMessage.mjs";

/**
 * @typedef {Object} AgentLoopConfig
 * @property {CallModel} callModel - Function to call the language model
 * @property {{ messages: Message[] }} state - Agent state containing messages
 * @property {ToolDefinition[]} toolDefs - Tool definitions for the model
 * @property {Map<string, Tool>} toolByName - Map of tool names to tool implementations
 * @property {AgentEventEmitter} agentEventEmitter - Event emitter for agent events
 * @property {ToolUseApprover} toolUseApprover - Tool use approval checker
 * @property {SubagentManager} subagentManager - Subagent manager instance
 * @property {(toolUse: MessageContentToolUse, toolByName: Map<string, Tool>) => Promise<MessageContentToolResult>} callTool - Function to execute a tool call
 */

/**
 * @typedef {Object} AgentLoop
 * @property {(input: (MessageContentText | MessageContentImage)[]) => Promise<void>} handleUserInput - Process user input and run the agent turn loop
 */

/**
 * Create an agent loop handler
 * @param {AgentLoopConfig} config
 * @returns {AgentLoop}
 */
export function createAgentLoop({
  callModel,
  state,
  toolDefs,
  toolByName,
  agentEventEmitter,
  toolUseApprover,
  subagentManager,
  callTool,
}) {
  /**
   * Handle user input and run the agent turn loop
   * @param {(MessageContentText | MessageContentImage)[]} input - User input content
   * @returns {Promise<void>}
   */
  async function handleUserInput(input) {
    toolUseApprover.resetApprovalCount();

    const lastMessage = state.messages.at(-1);

    if (lastMessage?.content.some((part) => part.type === "tool_use")) {
      /** @type {MessageContentToolUse[]} */
      const toolUseParts = lastMessage.content.filter(
        (part) => part.type === "tool_use",
      );
      // Pending tool call
      if (
        input.length === 1 &&
        input[0].type === "text" &&
        input[0].text.toLocaleLowerCase().match(/^(yes|y|ｙ)$/i)
      ) {
        if (input[0].text.match(/^(YES|Y)$/)) {
          // Allow tool use
          for (const toolUse of toolUseParts) {
            toolUseApprover.allowToolUse(toolUse);
          }
        }

        // Approved
        /** @type {MessageContentToolResult[]} */
        const toolResults = [];
        for (const toolUse of toolUseParts) {
          toolResults.push(await callTool(toolUse, toolByName));
        }

        const userMessage = subagentManager.processToolResults(
          toolUseParts,
          toolResults,
          state.messages,
        );
        if (userMessage) {
          state.messages.push(userMessage);
        } else {
          state.messages.push({ role: "user", content: toolResults });
        }

        agentEventEmitter.emit(
          "message",
          state.messages[state.messages.length - 1],
        );
      } else {
        // Rejected
        /** @type {MessageContentToolResult[]} */
        const toolResults = toolUseParts.map((toolUse) => ({
          type: "tool_result",
          toolUseId: toolUse.toolUseId,
          toolName: toolUse.toolName,
          content: [{ type: "text", text: "Tool call rejected" }],
          isError: true,
        }));
        state.messages.push({ role: "user", content: toolResults });
        state.messages.push({
          role: "user",
          content: /** @type {(MessageContentText | MessageContentImage)[]} */ (
            input
          ),
        });
      }
    } else if (
      input.length === 1 &&
      input[0].type === "text" &&
      input[0].text.toLowerCase() === "/resume"
    ) {
      // Resume the conversation stopped by rate limit, etc.
    } else {
      // No pending tool call
      state.messages.push({
        role: "user",
        content: input,
      });
    }

    await runTurnLoop();
    agentEventEmitter.emit("turnEnd");
  }

  /**
   * Run the main agent turn loop
   * @returns {Promise<void>}
   */
  async function runTurnLoop() {
    let thinkingLoops = 0;
    const maxThinkingLoops = 5;

    while (true) {
      const modelOutput = await callModel({
        messages: state.messages,
        tools: toolDefs,
        /**
         * @param {PartialMessageContent} partialContent
         */
        onPartialMessageContent: (partialContent) => {
          agentEventEmitter.emit("partialMessageContent", partialContent);
        },
      });

      if (modelOutput instanceof Error) {
        agentEventEmitter.emit("error", modelOutput);
        break;
      }

      const { message: assistantMessage, providerTokenUsage } = modelOutput;
      state.messages.push(assistantMessage);
      agentEventEmitter.emit("message", assistantMessage);
      agentEventEmitter.emit("providerTokenUsage", providerTokenUsage);

      // Gemini may stop with "thinking" -> continue
      const lastContent = assistantMessage.content.at(-1);
      if (lastContent?.type === "thinking") {
        thinkingLoops += 1;
        if (thinkingLoops > maxThinkingLoops) {
          break;
        }

        state.messages.push({
          role: "user",
          content: [{ type: "text", text: "System: Continue" }],
        });
        console.error(
          styleText(
            "yellow",
            `\nModel is thinking. Sending "System: Continue" (Loop: ${thinkingLoops}/${maxThinkingLoops})`,
          ),
        );
        continue;
      }

      const toolUseParts = /** @type {MessageContentToolUse[]} */ (
        assistantMessage.content.filter(
          /** @param {any} part */
          (part) => part.type === "tool_use",
        )
      );

      // No tool use -> turn end
      if (toolUseParts.length === 0) {
        break;
      }

      // Validate tool use (unknown tools and exclusive tool violations)
      const exclusiveToolNames = [
        delegateToSubagentTool.def.name,
        reportAsSubagentTool.def.name,
      ];
      const validation = validateToolUse(
        toolUseParts,
        toolByName,
        exclusiveToolNames,
      );

      if (!validation.isValid) {
        state.messages.push({
          role: "user",
          content: /** @type {MessageContentToolResult[]} */ (
            validation.toolResults
          ),
        });
        state.messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: /** @type {string} */ (validation.errorMessage),
            },
          ],
        });
        console.error(
          styleText("yellow", /** @type {string} */ (validation.errorMessage)),
        );
        continue;
      }

      // Auto approve tool use
      const decisions = toolUseParts.map(toolUseApprover.isAllowedToolUse);

      const hasDeniedToolUse = decisions.some((d) => d.action === "deny");
      if (hasDeniedToolUse) {
        /** @type {MessageContentToolResult[]} */
        const toolResults = toolUseParts.map((toolUse, index) => {
          const decision = decisions[index];
          const rejectionMessage =
            decision.action === "deny"
              ? `Tool call rejected. ${decision.reason || ""}`.trim()
              : "Tool call rejected due to other denied tool calls";

          return {
            type: "tool_result",
            toolUseId: toolUse.toolUseId,
            toolName: toolUse.toolName,
            content: [{ type: "text", text: rejectionMessage }],
            isError: true,
          };
        });
        state.messages.push({ role: "user", content: toolResults });
        agentEventEmitter.emit(
          "message",
          state.messages[state.messages.length - 1],
        );
        continue;
      }

      const isAllToolUseApproved = decisions.every((d) => d.action === "allow");
      if (!isAllToolUseApproved) {
        agentEventEmitter.emit("toolUseRequest");
        break;
      }

      /** @type {MessageContentToolResult[]} */
      const toolResults = [];
      for (const toolUse of toolUseParts) {
        toolResults.push(await callTool(toolUse, toolByName));
      }

      const userMessage = subagentManager.processToolResults(
        toolUseParts,
        toolResults,
        state.messages,
      );
      if (userMessage) {
        state.messages.push(userMessage);
      } else {
        state.messages.push({ role: "user", content: toolResults });
      }

      agentEventEmitter.emit(
        "message",
        state.messages[state.messages.length - 1],
      );

      const interruptMessage = await consumeInterruptMessage();
      if (interruptMessage) {
        state.messages.push({
          role: "user",
          content: [{ type: "text", text: interruptMessage }],
        });
        agentEventEmitter.emit(
          "message",
          state.messages[state.messages.length - 1],
        );
      }
    }
  }

  return {
    handleUserInput,
  };
}
