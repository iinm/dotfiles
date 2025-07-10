/**
 * @import { Agent, AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { Message, MessageContentToolResult, MessageContentToolUse, PartialMessageContent } from "./model"
 * @import { Tool, ToolDefinition } from "./tool"
 */

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";
import { AGENT_PROJECT_METADATA_DIR } from "./env.mjs";

/**
 * @param {AgentConfig} config
 * @returns {Agent}
 */
export function createAgent({ callModel, prompt, tools, toolUseApprover }) {
  /** @type {{ messages: Message[] }} */
  const state = {
    messages: [
      {
        role: "system",
        content: [{ type: "text", text: prompt }],
      },
    ],
  };

  /** @type {UserEventEmitter} */
  const userEventEmitter = new EventEmitter();
  /** @type {AgentEventEmitter} */
  const agentEventEmitter = new EventEmitter();

  /** @type {Map<string, Tool>} */
  const toolByName = new Map();
  for (const tool of tools) {
    toolByName.set(tool.def.name, tool);
  }

  /** @type {ToolDefinition[]} */
  const toolDefs = tools.map(({ def }) => def);

  /**
   * Clear all messages except the system prompt
   */
  function clearMessages() {
    // Keep only the system message (first message)
    state.messages.splice(1);
  }

  async function dumpMessages() {
    const filePath = path.join(AGENT_PROJECT_METADATA_DIR, "messages.json");
    try {
      await fs.writeFile(filePath, JSON.stringify(state.messages, null, 2));
      console.log(`Messages dumped to ${filePath}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error dumping messages: ${error.message}`);
      } else {
        console.error(
          "An unknown error occurred while dumping messages:",
          error,
        );
      }
    }
  }

  async function loadMessages() {
    const filePath = path.join(AGENT_PROJECT_METADATA_DIR, "messages.json");
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const loadedMessages = JSON.parse(data);
      if (Array.isArray(loadedMessages)) {
        // Keep the system message (index 0) and replace the rest
        state.messages.splice(
          1,
          state.messages.length - 1,
          ...loadedMessages.slice(1),
        );
        console.log(`Messages loaded from ${filePath}`);
      } else {
        console.error("Error loading messages: Invalid format in file.");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error dumping messages: ${error.message}`);
      }
    }
  }

  userEventEmitter.on("userInput", async (input) => {
    const lastMessage = state.messages.at(-1);

    if (lastMessage?.content.some((part) => part.type === "tool_use")) {
      /** @type {MessageContentToolUse[]} */
      const toolUseParts = lastMessage.content.filter(
        (part) => part.type === "tool_use",
      );
      // Pending tool call
      if (input.toLowerCase().match(/^(yes|y|ｙ)$/i)) {
        if (input.match(/^(YES|Y)$/)) {
          // Allow tool use
          for (const toolUse of toolUseParts) {
            toolUseApprover.allowToolUse(toolUse);
          }
        }

        // Approved
        const toolResults = await Promise.all(
          toolUseParts.map((toolUse) => callTool(toolUse, toolByName)),
        );
        state.messages.push({ role: "user", content: toolResults });
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
          content: [{ type: "text", text: input }],
        });
      }
    } else if (input.toLowerCase() === "/resume") {
      // Resume the conversation stopped by rate limit, etc.
    } else {
      // No pending tool call
      state.messages.push({
        role: "user",
        content: [{ type: "text", text: input }],
      });
    }

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
        (part) => part.type === "tool_use",
      );

      // No tool use -> turn end
      if (toolUseParts.length === 0) {
        break;
      }

      // Auto approve tool use
      const isAllToolUseApproved = toolUseParts.every(
        toolUseApprover.isAllowedToolUse,
      );
      if (!isAllToolUseApproved) {
        agentEventEmitter.emit("toolUseRequest");
        break;
      }

      const toolResults = await Promise.all(
        toolUseParts.map((toolUse) => callTool(toolUse, toolByName)),
      );

      state.messages.push({ role: "user", content: toolResults });
      agentEventEmitter.emit(
        "message",
        state.messages[state.messages.length - 1],
      );
    }

    agentEventEmitter.emit("turnEnd");
  });

  return {
    userEventEmitter,
    agentEventEmitter,
    agentCommands: {
      clearMessages,
      dumpMessages,
      loadMessages,
    },
  };
}

/**
 * @param {MessageContentToolUse} toolUse
 * @param {Map<string, Tool>} toolByName
 * @returns {Promise<MessageContentToolResult>}
 */
async function callTool(toolUse, toolByName) {
  const tool = toolByName.get(toolUse.toolName);
  if (!tool) {
    return {
      type: "tool_result",
      toolUseId: toolUse.toolUseId,
      toolName: toolUse.toolName,
      content: [{ type: "text", text: `Tool not found: ${toolUse.toolName}` }],
      isError: true,
    };
  }

  const result = await tool.impl(toolUse.input);
  if (result instanceof Error) {
    return {
      type: "tool_result",
      toolUseId: toolUse.toolUseId,
      toolName: toolUse.toolName,
      content: [{ type: "text", text: result.message }],
      isError: true,
    };
  }

  if (typeof result === "string") {
    return {
      type: "tool_result",
      toolUseId: toolUse.toolUseId,
      toolName: toolUse.toolName,
      content: [{ type: "text", text: result }],
    };
  }

  return {
    type: "tool_result",
    toolUseId: toolUse.toolUseId,
    toolName: toolUse.toolName,
    content: result,
  };
}
