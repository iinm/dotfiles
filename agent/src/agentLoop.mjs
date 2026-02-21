/**
 * @import { AgentEventEmitter } from "./agent"
 * @import { Message, MessageContentText, MessageContentImage, MessageContentToolResult, MessageContentToolUse, PartialMessageContent } from "./model"
 * @import { Tool, ToolDefinition, ToolUseApprover } from "./tool"
 * @import { SubagentManager } from "./subagentManager.mjs"
 */

import { styleText } from "node:util";
import { delegateToSubagentTool } from "./tools/delegateToSubagent.mjs";
import { reportAsSubagentTool } from "./tools/reportAsSubagent.mjs";
import {
  createExclusiveToolViolationLogMessage,
  createExclusiveToolViolationResults,
  createUnknownToolErrorMessage,
  createUnknownToolResults,
  findUnknownToolNames,
  validateExclusiveToolUse,
} from "./toolValidation.mjs";
import { consumeInterruptMessage } from "./utils/consumeInterruptMessage.mjs";

/**
 * @typedef {Object} AgentLoopConfig
 * @property {Function} callModel - Function to call the language model
 * @property {{ messages: Message[] }} state - Agent state containing messages
 * @property {ToolDefinition[]} toolDefs - Tool definitions for the model
 * @property {Map<string, Tool>} toolByName - Map of tool names to tool implementations
 * @property {AgentEventEmitter} agentEventEmitter - Event emitter for agent events
 * @property {ToolUseApprover} toolUseApprover - Tool use approval checker
 * @property {SubagentManager} subagentManager - Subagent manager instance
 * @property {Function} callTool - Function to execute a tool call
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

      /** @type {MessageContentToolUse[]} */
      const toolUseParts = assistantMessage.content.filter(
        /** @param {any} part */
        (part) => part.type === "tool_use",
      );

      // No tool use -> turn end
      if (toolUseParts.length === 0) {
        break;
      }

      // Validate tool use
      const unknownToolNames = findUnknownToolNames(toolUseParts, toolByName);
      if (unknownToolNames.length) {
        state.messages.push({
          role: "user",
          content: createUnknownToolResults(toolUseParts, unknownToolNames),
        });
        state.messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: createUnknownToolErrorMessage(unknownToolNames, toolByName),
            },
          ],
        });
        console.error(
          styleText(
            "yellow",
            `\nRejected unknown tool use: ${unknownToolNames.join(", ")}`,
          ),
        );
        continue;
      }

      // Validate exclusive tool use (delegate_to_subagent, report_as_subagent)
      const exclusiveToolNames = [
        delegateToSubagentTool.def.name,
        reportAsSubagentTool.def.name,
      ];
      const exclusiveValidation = validateExclusiveToolUse(
        toolUseParts,
        exclusiveToolNames,
      );

      if (!exclusiveValidation.isValid) {
        state.messages.push({
          role: "user",
          content: createExclusiveToolViolationResults(toolUseParts),
        });
        state.messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: /** @type {string} */ (exclusiveValidation.errorMessage),
            },
          ],
        });
        if (
          exclusiveValidation.violationType &&
          exclusiveValidation.violatedTools
        ) {
          console.error(
            styleText(
              "yellow",
              createExclusiveToolViolationLogMessage(
                /** @type {string[]} */ (exclusiveValidation.violatedTools),
                /** @type {'multiple'|'with-others'} */ (
                  exclusiveValidation.violationType
                ),
              ),
            ),
          );
        }
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
