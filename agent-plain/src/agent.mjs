/**
 * @import { AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { ChatMessage, ChatMessageToolResult, ChatMessageToolUse } from "./model"
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

  /** @type {ChatMessage[]} */
  const messages = [];

  userEventEmitter.on("userInput", async (input) => {
    messages.push({ role: "user", content: [{ type: "text", text: input }] });

    const modelMessage = await callModel({
      messages,
      tools: toolDefs,
    });
    if (modelMessage instanceof Error) {
      throw modelMessage;
    }

    messages.push(modelMessage);
    agentEventEmitter.emit("message", messages[messages.length - 1]);

    // Tool use
    // TODO: approval flow
    while (true) {
      const lastMessage = messages[messages.length - 1];
      /** @type {ChatMessageToolUse[]} */
      const toolUseParts = [];
      for (const part of lastMessage.content) {
        if (part.type === "tool_use") {
          toolUseParts.push(part);
        }
      }

      if (toolUseParts.length === 0) {
        break;
      }

      /** @type {ChatMessageToolResult[]} */
      const toolResults = [];
      for (const toolUse of toolUseParts) {
        const tool = toolByName.get(toolUse.toolName);
        /** @type {ChatMessageToolResult} */
        if (!tool) {
          toolResults.push({
            type: "tool_result",
            toolUseId: toolUse.toolUseId,
            content: `Tool not found: ${toolUse.toolName}`,
            isError: true,
          });
          continue;
        }

        const result = await tool.impl(toolUse.args);
        if (result instanceof Error) {
          toolResults.push({
            type: "tool_result",
            toolUseId: toolUse.toolUseId,
            content: result.message,
            isError: true,
          });
          continue;
        }

        toolResults.push({
          type: "tool_result",
          toolUseId: toolUse.toolUseId,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });
      agentEventEmitter.emit("message", messages[messages.length - 1]);

      const modelMessage = await callModel({
        messages,
        tools: toolDefs,
      });
      if (modelMessage instanceof Error) {
        throw modelMessage;
      }
      messages.push(modelMessage);
      agentEventEmitter.emit("message", messages[messages.length - 1]);
    }
  });

  return {
    userEventEmitter,
    agentEventEmitter,
  };
}
