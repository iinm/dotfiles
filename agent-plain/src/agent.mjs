/**
 * @import { AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { Message, MessageContentToolResult, MessageContentToolUse } from "./model"
 * @import { Tool, ToolDefinition } from "./tool"
 */

import { EventEmitter } from "node:events";

/**
 * @param {AgentConfig} config
 */
export function createAgent({ callModel, tools }) {
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
  const messages = [];

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

    const modelMessage = await callModel({
      messages,
      tools: toolDefs,
    });
    if (modelMessage instanceof Error) {
      // TODO: recover from error
      throw modelMessage;
    }

    messages.push(modelMessage);
    agentEventEmitter.emit("message", messages[messages.length - 1]);

    // Tool use
    while (true) {
      const lastMessage = messages[messages.length - 1];
      /** @type {MessageContentToolUse[]} */
      const toolUseParts = lastMessage.content.filter(
        (part) => part.type === "tool_use",
      );
      if (toolUseParts.length === 0) {
        break;
      }

      agentEventEmitter.emit("toolUseRequest");
      break;

      // TODO: auto approve
      // /** @type {MessageContentToolResult[]} */
      // const toolResults = [];
      // for (const toolUse of toolUseParts) {
      //   const toolResult = await callTool(toolUse, toolByName);
      //   toolResults.push(toolResult);
      // }
      //
      // messages.push({ role: "user", content: toolResults });
      // agentEventEmitter.emit("message", messages[messages.length - 1]);
      //
      // const modelMessage = await callModel({
      //   messages,
      //   tools: toolDefs,
      // });
      // if (modelMessage instanceof Error) {
      //   throw modelMessage;
      // }
      //
      // messages.push(modelMessage);
      // agentEventEmitter.emit("message", messages[messages.length - 1]);
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
      content: `Tool not found: ${toolUse.toolName}`,
      isError: true,
    };
  }

  const result = await tool.impl(toolUse.args);
  if (result instanceof Error) {
    return {
      type: "tool_result",
      toolUseId: toolUse.toolUseId,
      content: result.message,
      isError: true,
    };
  }

  return {
    type: "tool_result",
    toolUseId: toolUse.toolUseId,
    content: result,
  };
}
