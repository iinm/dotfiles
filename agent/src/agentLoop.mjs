/**
 * @import { AgentEventEmitter } from "./agent"
 * @import { CallModel, Message, MessageContentText, MessageContentImage, MessageContentToolResult, MessageContentToolUse, PartialMessageContent } from "./model"
 * @import { ToolDefinition, ToolUseApprover } from "./tool"
 * @import { SubagentManager } from "./subagentManager.mjs"
 */

import { styleText } from "node:util";
import { createInputHandler } from "./inputHandler.mjs";
import { consumeInterruptMessage } from "./utils/consumeInterruptMessage.mjs";

/**
 * @typedef {Object} AgentLoopConfig
 * @property {CallModel} callModel - Function to call the language model
 * @property {{ messages: Message[] }} state - Agent state containing messages
 * @property {ToolDefinition[]} toolDefs - Tool definitions for the model
 * @property {import("./toolExecutor.mjs").ToolExecutor} toolExecutor - Tool executor instance
 * @property {AgentEventEmitter} agentEventEmitter - Event emitter for agent events
 * @property {ToolUseApprover} toolUseApprover - Tool use approval checker
 * @property {SubagentManager} subagentManager - Subagent manager instance
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
  toolExecutor,
  agentEventEmitter,
  toolUseApprover,
  subagentManager,
}) {
  const inputHandler = createInputHandler({
    state,
    toolExecutor,
    subagentManager,
    toolUseApprover,
    agentEventEmitter,
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
      state.messages = [...state.messages, assistantMessage];
      agentEventEmitter.emit("message", assistantMessage);
      agentEventEmitter.emit("providerTokenUsage", providerTokenUsage);

      // Gemini may stop with "thinking" -> continue
      const lastContent = assistantMessage.content.at(-1);
      if (lastContent?.type === "thinking") {
        thinkingLoops += 1;
        if (thinkingLoops > maxThinkingLoops) {
          break;
        }

        state.messages = [
          ...state.messages,
          {
            role: "user",
            content: [{ type: "text", text: "System: Continue" }],
          },
        ];
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

      // Step 1: Validation (early return on invalid input)
      const validation = toolExecutor.validateBatch(toolUseParts);
      if (!validation.isValid) {
        state.messages = [
          ...state.messages,
          {
            role: "user",
            content: /** @type {MessageContentToolResult[]} */ (
              validation.toolResults
            ),
          },
        ];
        if (validation.errorMessage) {
          console.error(styleText("yellow", validation.errorMessage));
        }
        agentEventEmitter.emit(
          "message",
          state.messages[state.messages.length - 1],
        );
        continue;
      }

      // Step 2: Approve tool use
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
        state.messages = [
          ...state.messages,
          { role: "user", content: toolResults },
        ];
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

      const executionResult = await toolExecutor.executeBatch(toolUseParts);

      if (!executionResult.success) {
        state.messages = [
          ...state.messages,
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
        ];
        console.error(styleText("yellow", executionResult.errorMessage));
        continue;
      }

      const toolResults = executionResult.results;

      const result = subagentManager.processToolResults(
        toolUseParts,
        toolResults,
        state.messages,
      );
      state.messages = result.messages;
      if (result.newMessage) {
        state.messages = [...state.messages, result.newMessage];
      } else {
        state.messages = [
          ...state.messages,
          { role: "user", content: toolResults },
        ];
      }

      agentEventEmitter.emit(
        "message",
        state.messages[state.messages.length - 1],
      );

      const interruptMessage = await consumeInterruptMessage();
      if (interruptMessage) {
        state.messages = [
          ...state.messages,
          {
            role: "user",
            content: [{ type: "text", text: interruptMessage }],
          },
        ];
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
