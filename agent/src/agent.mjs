import { EventEmitter } from "node:events";
/**
 * @import { AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { Message, MessageContentToolResult, MessageContentToolUse, PartialMessageContent } from "./model"
 * @import { Tool, ToolDefinition } from "./tool"
 */
import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "./config.mjs";

/**
 * @param {AgentConfig} config
 */
export function createAgent({ callModel, prompt, tools, toolUseApprover }) {
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

  /** @type {Message[]} */
  const messages = [
    {
      role: "system",
      content: [{ type: "text", text: prompt }],
    },
  ];

  /**
   * Clear all messages except the system prompt
   */
  function clearMessages() {
    // Keep only the system message (first message)
    messages.splice(1);
  }

  /**
   * Remove the last message from the conversation
   * @returns {Message|undefined} The removed message or undefined if no message was removed
   */
  function removeLastMessage() {
    // Don't remove the system message
    if (messages.length <= 1) {
      return undefined;
    }
    const removedMessage = messages.pop();
    return removedMessage;
  }

  userEventEmitter.on("userInput", async (input) => {
    // Handle special commands
    if (input === "/clear") {
      clearMessages();
      agentEventEmitter.emit("turnEnd");
      return;
    }

    if (input === "/debug.msg.pop") {
      removeLastMessage();
      agentEventEmitter.emit("turnEnd");
      return;
    }

    if (input === "/debug.msg.dump") {
      const filePath = path.join(AGENT_PROJECT_METADATA_DIR, "messages.json");
      try {
        await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
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
      agentEventEmitter.emit("turnEnd");
      return;
    }

    if (input === "/debug.msg.load") {
      const filePath = path.join(AGENT_PROJECT_METADATA_DIR, "messages.json");
      try {
        const data = await fs.readFile(filePath, "utf-8");
        const loadedMessages = JSON.parse(data);
        if (Array.isArray(loadedMessages)) {
          // Keep the system message (index 0) and replace the rest
          messages.splice(1, messages.length - 1, ...loadedMessages.slice(1));
          console.log(`Messages loaded from ${filePath}`);
        } else {
          console.error("Error loading messages: Invalid format in file.");
        }
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
      agentEventEmitter.emit("turnEnd");
      return;
    }

    const lastMessage = messages.at(-1);

    if (lastMessage?.content.some((part) => part.type === "tool_use")) {
      /** @type {MessageContentToolUse[]} */
      const toolUseParts = lastMessage.content.filter(
        (part) => part.type === "tool_use",
      );
      // Pending tool call
      if (input.toLowerCase().match(/^(yes|y)$/i)) {
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
        messages.push({ role: "user", content: toolResults });
        agentEventEmitter.emit("message", messages[messages.length - 1]);
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
        messages.push({ role: "user", content: toolResults });
        messages.push({
          role: "user",
          content: [{ type: "text", text: input }],
        });
      }
    } else if (input.toLowerCase().match(/^\/(resume|continue)$/i)) {
      // Resume the conversation stopped by rate limit, etc.
    } else {
      // No pending tool call
      messages.push({ role: "user", content: [{ type: "text", text: input }] });
    }

    while (true) {
      const modelOutput = await callModel({
        messages,
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
      messages.push(assistantMessage);
      agentEventEmitter.emit("message", assistantMessage);
      agentEventEmitter.emit("providerTokenUsage", providerTokenUsage);

      // Approve tool use
      /** @type {MessageContentToolUse[]} */
      const toolUseParts = assistantMessage.content.filter(
        (part) => part.type === "tool_use",
      );
      if (toolUseParts.length === 0) {
        break;
      }

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

      messages.push({ role: "user", content: toolResults });
      agentEventEmitter.emit("message", messages[messages.length - 1]);
    }

    agentEventEmitter.emit("turnEnd");
  });

  return {
    userEventEmitter,
    agentEventEmitter,
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
