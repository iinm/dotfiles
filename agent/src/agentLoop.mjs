/**
 * @import { AgentEventEmitter } from "./agent"
 * @import { CallModel, MessageContentText, MessageContentImage, MessageContentToolResult, PartialMessageContent } from "./model"
 * @import { ToolDefinition, ToolUseApprover } from "./tool"
 * @import { SubagentManager } from "./subagentManager.mjs"
 * @import { StateManager } from "./stateManager.mjs"
 */

import { styleText } from "node:util";
import { consumeInterruptMessage } from "./context/consumeInterruptMessage.mjs";
import { createInputHandler } from "./inputHandler.mjs";

/**
 * @typedef {Object} AgentLoopConfig
 * @property {CallModel} callModel - Function to call the language model
 * @property {StateManager} stateManager - State manager for message handling
 * @property {ToolDefinition[]} toolDefs - Tool definitions for the model
 * @property {import("./toolExecutor.mjs").ToolExecutor} toolExecutor - Tool executor instance
 * @property {AgentEventEmitter} agentEventEmitter - Event emitter for agent events
 * @property {ToolUseApprover} toolUseApprover - Tool use approval checker
 * @property {SubagentManager} subagentManager - Subagent manager instance
 */

/**
 * @typedef {ReturnType<typeof createAgentLoop>} AgentLoop
 */

/**
 * Create an agent loop handler
 * @param {AgentLoopConfig} config
 */
export function createAgentLoop({
  callModel,
  stateManager,
  toolDefs,
  toolExecutor,
  agentEventEmitter,
  toolUseApprover,
  subagentManager,
}) {
  const inputHandler = createInputHandler({
    stateManager,
    toolExecutor,
    subagentManager,
    toolUseApprover,
  });

  /**
   * Handle user input and run the agent turn loop
   * @param {(MessageContentText | MessageContentImage)[]} input - User input content
   * @returns {Promise<void>}
   */
  async function handleUserInput(input) {
    toolUseApprover.resetApprovalCount();
    await inputHandler.handle(input);
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
        messages: stateManager.getMessages(),
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
      stateManager.appendMessages([assistantMessage]);
      agentEventEmitter.emit("providerTokenUsage", providerTokenUsage);

      // Gemini may stop with "thinking" -> continue
      const lastContent = assistantMessage.content.at(-1);
      if (lastContent?.type === "thinking") {
        thinkingLoops += 1;
        if (thinkingLoops > maxThinkingLoops) {
          break;
        }

        stateManager.appendMessages([
          {
            role: "user",
            content: [{ type: "text", text: "System: Continue" }],
          },
        ]);
        console.error(
          styleText(
            "yellow",
            `\nModel is thinking. Sending "System: Continue" (Loop: ${thinkingLoops}/${maxThinkingLoops})`,
          ),
        );
        continue;
      }

      const toolUseParts = assistantMessage.content.filter(
        (part) => part.type === "tool_use",
      );

      // No tool use -> turn end
      if (toolUseParts.length === 0) {
        break;
      }

      const validation = toolExecutor.validateBatch(toolUseParts);
      if (!validation.isValid) {
        stateManager.appendMessages([
          {
            role: "user",
            content: validation.toolResults,
          },
        ]);
        if (validation.errorMessage) {
          console.error(styleText("yellow", validation.errorMessage));
        }
        continue;
      }

      // Approve tool use
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
        stateManager.appendMessages([{ role: "user", content: toolResults }]);
        continue;
      }

      const isAllToolUseApproved = decisions.every((d) => d.action === "allow");
      if (!isAllToolUseApproved) {
        agentEventEmitter.emit("toolUseRequest");
        break;
      }

      const executionResult = await toolExecutor.executeBatch(toolUseParts);

      if (!executionResult.success) {
        stateManager.appendMessages([
          {
            role: "user",
            content: executionResult.errors,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: executionResult.errorMessage,
              },
            ],
          },
        ]);
        console.error(styleText("yellow", executionResult.errorMessage));
        continue;
      }

      const toolResults = executionResult.results;

      const result = subagentManager.processToolResults(
        toolUseParts,
        toolResults,
        stateManager.getMessages(),
      );
      stateManager.setMessages(result.messages);
      if (result.newMessage) {
        stateManager.appendMessages([result.newMessage]);
      } else {
        stateManager.appendMessages([{ role: "user", content: toolResults }]);
      }

      const interruptMessage = await consumeInterruptMessage();
      if (interruptMessage) {
        stateManager.appendMessages([
          {
            role: "user",
            content: [{ type: "text", text: interruptMessage }],
          },
        ]);
      }
    }
  }

  return {
    handleUserInput,
  };
}
