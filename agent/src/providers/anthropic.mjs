/**
 * @import { ModelInput, Message, AssistantMessage, ModelOutput } from "../model";
 * @import { AnthropicChatCompletion, AnthropicMessage, AnthropicToolDefinition, AnthropicModelConfig, AnthropicAssistantMessage } from "./anthropic";
 * @import { ToolDefinition } from "../tool";
 */

import { noThrow } from "../utils/noThrow.mjs";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * @param {AnthropicModelConfig} config
 * @param {ModelInput} input
 * @returns {Promise<ModelOutput | Error>}
 */
export async function callAnthropicModel(config, input) {
  return await noThrow(async () => {
    const messages = convertGenericMessageToAnthropicFormat(input.messages);
    const cacheEnabledMessages = enableContextCaching(messages);
    const tools = convertGenericToolDefinitionToAnthropicFormat(
      input.tools || [],
    );

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": `${ANTHROPIC_API_KEY}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        ...config,
        system: messages
          .filter((m) => m.role === "system")
          .flatMap((m) => m.content),
        messages: cacheEnabledMessages.filter((m) => m.role !== "system"),
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

    return {
      message: convertAnthropicAssistantMessageToGenericFormat(body),
      providerTokenUsage: body.usage,
    };
  });
}

/**
 * @param {Message[]} genericMessages
 * @returns {AnthropicMessage[]}
 */
function convertGenericMessageToAnthropicFormat(genericMessages) {
  /** @type {AnthropicMessage[]} */
  const anthropicMessages = [];
  for (const genericMessage of genericMessages) {
    switch (genericMessage.role) {
      case "system": {
        anthropicMessages.push({
          role: "system",
          content: genericMessage.content.map((part) => {
            if (part.type === "text") {
              return { type: "text", text: part.text };
            }
            throw new Error(`Unknown message part type: ${part}`);
          }),
        });
        break;
      }
      case "user": {
        anthropicMessages.push({
          role: "user",
          content: genericMessage.content.map((part) => {
            if (part.type === "text") {
              return { type: "text", text: part.text };
            }
            if (part.type === "tool_result") {
              return {
                type: "tool_result",
                tool_use_id: part.toolUseId,
                content: [
                  {
                    type: "text",
                    text: part.content,
                  },
                ],
                is_error: part.isError,
              };
            }
            throw new Error(`Unknown message part type: ${part}`);
          }),
        });
        break;
      }
      case "assistant": {
        anthropicMessages.push({
          role: "assistant",
          content: genericMessage.content.map((part) => {
            if (part.type === "text") {
              return { type: "text", text: part.text };
            }
            if (part.type === "tool_use") {
              return {
                type: "tool_use",
                id: part.toolUseId,
                name: part.toolName,
                input: part.input,
              };
            }
            throw new Error(`Unknown message part type: ${part}`);
          }),
        });
        break;
      }
    }
  }

  return anthropicMessages;
}

/**
 * @param {AnthropicAssistantMessage} anthropicAssistantMessage
 * @returns {AssistantMessage}
 */
function convertAnthropicAssistantMessageToGenericFormat(
  anthropicAssistantMessage,
) {
  /** @type {AssistantMessage["content"]} */
  const content = [];
  for (const part of anthropicAssistantMessage.content) {
    if (part.type === "text") {
      content.push({ type: "text", text: part.text });
    } else if (part.type === "tool_use") {
      content.push({
        type: "tool_use",
        toolUseId: part.id,
        toolName: part.name,
        input: part.input,
      });
    }
  }

  return {
    role: "assistant",
    content,
  };
}

/**
 * @param {ToolDefinition[]} genericToolDefs
 * @returns {AnthropicToolDefinition[]}
 */
function convertGenericToolDefinitionToAnthropicFormat(genericToolDefs) {
  /** @type {AnthropicToolDefinition[]} */
  const anthropicToolDefs = [];
  for (const tool of genericToolDefs) {
    anthropicToolDefs.push({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    });
  }
  return anthropicToolDefs;
}

/**
 * @param {AnthropicMessage[]} messages
 * @returns {AnthropicMessage[]}
 */
function enableContextCaching(messages) {
  /** @type {number[]} */
  const userMessageIndices = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") {
      userMessageIndices.push(i);
    }
  }
  const cacheTargetIndices = [
    // last user message
    userMessageIndices.at(-1),
    // second last user message
    userMessageIndices.at(-2),
  ].filter((index) => index !== undefined);

  const contextCachingEnabledMessages = messages.map((message, index) => {
    if (
      (index === 0 && message.role === "system") ||
      cacheTargetIndices.includes(index)
    ) {
      return {
        ...message,
        content: message.content.map((part, partIndex) =>
          partIndex === message.content.length - 1
            ? { ...part, cache_control: { type: "ephemeral" } }
            : part,
        ),
      };
    }
    return message;
  });

  return /** @type {AnthropicMessage[]} */ (contextCachingEnabledMessages);
}
