/**
 * @import { ModelInput, Message, MessageContent } from "../model";
 * @import { AnthropicChatCompletion, AnthropicChatMessage, AnthropicMessageContent, AnthropicToolDefinition, AnthropicModelConfig } from "./anthropic";
 */

import { noThrow } from "../utils/noThrow.mjs";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * @param {AnthropicModelConfig} config
 * @param {ModelInput} input
 * @returns {Promise<Message | Error>}
 */
export async function callAnthropicModel(config, input) {
  return await noThrow(async () => {
    // Convert generic message format to Anthropic format
    /** @type {AnthropicChatMessage[]} */
    const messages = [];
    for (const genericMessage of input.messages) {
      /** @type {AnthropicMessageContent[]} */
      const content = [];
      for (const part of genericMessage.content) {
        if (part.type === "text") {
          content.push({ type: "text", text: part.text });
        } else if (part.type === "tool_use") {
          content.push({
            type: "tool_use",
            id: part.toolUseId,
            name: part.toolName,
            input: part.args,
          });
        } else if (part.type === "tool_result") {
          content.push({
            type: "tool_result",
            tool_use_id: part.toolUseId,
            content: part.content,
          });
        }
      }
      messages.push({
        role: genericMessage.role,
        content: content,
      });
    }

    // Convert generic tool format to Anthropic format
    /** @type {AnthropicToolDefinition[]} */
    const tools = [];
    if (input.tools) {
      for (const tool of input.tools) {
        tools.push({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        });
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": `${ANTHROPIC_API_KEY}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        ...config,
        messages,
        tools: tools.length ? tools : undefined,
      }),
    });

    if (response.status !== 200) {
      return new Error(
        `Failed to call Anthropic model: status=${response.status}, body=${await response.text()}`,
      );
    }

    /** @type {AnthropicChatCompletion} */
    const body = await response.json();

    // Convert Anthropic format to generic message format
    /** @type {MessageContent[]} */
    const content = [];
    for (const part of body.content) {
      if (part.type === "text") {
        content.push({ type: "text", text: part.text });
      } else if (part.type === "tool_use") {
        content.push({
          type: "tool_use",
          toolUseId: part.id,
          toolName: part.name,
          args: part.input,
        });
      }
    }

    /** @type {Message} */
    const message = {
      role: "assistant",
      content: content,
    };

    return message;
  });
}
