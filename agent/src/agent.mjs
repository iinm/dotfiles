/**
 * @import { AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { Message, MessageContentToolResult, MessageContentToolUse } from "./model"
 * @import { Tool, ToolDefinition } from "./tool"
 */

import { EventEmitter } from "node:events";

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

  userEventEmitter.on("userInput", async (input) => {
    const lastMessage = messages.at(-1);

    if (lastMessage?.content.some((part) => part.type === "tool_use")) {
      /** @type {MessageContentToolUse[]} */
      const toolUseParts = lastMessage.content.filter(
        (part) => part.type === "tool_use",
      );
      // Pending tool call
      if (input.toLowerCase().match(/^(yes|y)$/i)) {
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
          content: "Tool call rejected",
          isError: true,
        }));
        messages.push({ role: "user", content: toolResults });
        messages.push({
          role: "user",
          content: [{ type: "text", text: input }],
        });
      }
    } else {
      // No pending tool call
      messages.push({ role: "user", content: [{ type: "text", text: input }] });
    }

    while (true) {
      const modelOutput = await callModel({
        messages,
        tools: toolDefs,
        onStreamEvent: (event) => {
          agentEventEmitter.emit("stream", event);
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

      const isAllToolUseApproved = toolUseParts.every(toolUseApprover);
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
      content: `Tool not found: ${toolUse.toolName}`,
      isError: true,
    };
  }

  const result = await tool.impl(toolUse.input);
  if (result instanceof Error) {
    return {
      type: "tool_result",
      toolUseId: toolUse.toolUseId,
      toolName: toolUse.toolName,
      content: result.message,
      isError: true,
    };
  }

  return {
    type: "tool_result",
    toolUseId: toolUse.toolUseId,
    toolName: toolUse.toolName,
    content: result,
  };
}
