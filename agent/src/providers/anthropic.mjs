/**
 * @import { ModelInput, Message, AssistantMessage, ModelOutput, PartialMessageContent } from "../model";
 * @import { AnthropicChatCompletion, AnthropicMessage, AnthropicToolDefinition, AnthropicModelConfig, AnthropicAssistantMessage, AnthropicStreamEvent, AnthropicAssistantMessageContent, AnthropicChatCompletionUsage } from "./anthropic";
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
        stream: true,
      }),
    });

    if (response.status !== 200) {
      return new Error(
        `Failed to call Anthropic model: status=${response.status}, body=${await response.text()}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();

    /** @type {AnthropicStreamEvent[]} */
    const events = [];
    /** @type {PartialMessageContent | undefined} */
    let partialContent = undefined;
    for await (const event of readAnthropicStreamEvents(reader)) {
      events.push(event);

      partialContent = convertAnthropicStreamEventToAgentPartialContent(
        event,
        partialContent,
      );

      if (input.onPartialMessageContent && partialContent) {
        input.onPartialMessageContent(partialContent);
      }
    }

    /** @type {AnthropicChatCompletion} */
    const chatCompletion = convertAnthropicStreamEventsToChatCompletion(events);

    return {
      message: convertAnthropicAssistantMessageToGenericFormat(chatCompletion),
      providerTokenUsage: chatCompletion.usage,
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
            if (part.type === "thinking") {
              const signature = /** @type {string} */ (
                part.providerMetadata?.signature || ""
              );
              return {
                type: "thinking",
                thinking: part.thinking,
                signature,
              };
            }
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
 * @param {AnthropicStreamEvent} event
 * @param {PartialMessageContent | undefined} previousPartialContent
 * @returns {PartialMessageContent | undefined}
 */
function convertAnthropicStreamEventToAgentPartialContent(
  event,
  previousPartialContent,
) {
  switch (event.type) {
    case "content_block_start":
      return {
        type: event.content_block.type,
        position: "start",
      };
    case "content_block_delta":
      switch (event.delta.type) {
        case "text_delta":
          return {
            type: "text",
            content: event.delta.text,
            position: "delta",
          };
        case "thinking_delta":
          return {
            type: "thinking",
            content: event.delta.thinking,
            position: "delta",
          };
        case "input_json_delta":
          return {
            type: "tool_use",
            content: event.delta.partial_json,
            position: "delta",
          };
      }
      break;
    case "content_block_stop":
      return {
        type: previousPartialContent?.type || "unknown",
        position: "stop",
      };
  }
}

/**
 * @param {AnthropicStreamEvent[]} events
 * @returns {AnthropicChatCompletion}
 */
function convertAnthropicStreamEventsToChatCompletion(events) {
  /** @type {Partial<AnthropicChatCompletion>} */
  let chatCompletion = {};
  /** @type {string[]} */
  const toolUseInputJsonBuffer = [];
  for (const event of events) {
    if (event.type === "message_start") {
      chatCompletion = Object.assign(chatCompletion, event.message);
    } else if (event.type === "message_delta") {
      Object.assign(chatCompletion, event.delta);
      if (event.usage) {
        const usage = /** @type {AnthropicChatCompletionUsage} */ (
          chatCompletion.usage || {}
        );
        for (const [key, value] of Object.entries(event.usage)) {
          /** @type {number} */
          const currentValue =
            usage[/** @type {keyof AnthropicChatCompletionUsage} */ (key)] || 0;
          const updatedValue = currentValue + value;
          usage[/** @type {keyof AnthropicChatCompletionUsage} */ (key)] =
            updatedValue;
        }
        chatCompletion.usage = usage;
      }
    } else if (event.type === "content_block_start") {
      chatCompletion.content = chatCompletion.content || [];
      chatCompletion.content.push(
        /** @type {AnthropicAssistantMessageContent} */ (event.content_block),
      );
    } else if (event.type === "content_block_delta") {
      const lastContentPart = chatCompletion.content?.at(-1);
      if (lastContentPart) {
        switch (event.delta.type) {
          case "text_delta": {
            if (lastContentPart.type === "text") {
              lastContentPart.text = lastContentPart.text + event.delta.text;
            }
            break;
          }
          case "thinking_delta": {
            if (lastContentPart.type === "thinking") {
              lastContentPart.thinking =
                lastContentPart.thinking + event.delta.thinking;
            }
            break;
          }
          case "signature_delta": {
            if (lastContentPart.type === "thinking") {
              lastContentPart.signature = event.delta.signature;
            }
            break;
          }
          case "input_json_delta": {
            if (lastContentPart.type === "tool_use") {
              toolUseInputJsonBuffer.push(event.delta.partial_json);
            }
            break;
          }
        }
      } else {
        console.warn(
          `Received content block delta without a content block: ${JSON.stringify(event)}`,
        );
      }
    } else if (event.type === "content_block_stop") {
      const lastContentPart = chatCompletion.content?.at(-1);
      if (lastContentPart?.type === "tool_use") {
        lastContentPart.input = JSON.parse(toolUseInputJsonBuffer.join(""));
        toolUseInputJsonBuffer.length = 0;
      }
    }
  }

  return /** @type {AnthropicChatCompletion} */ (chatCompletion);
}

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
async function* readAnthropicStreamEvents(reader) {
  let buffer = new Uint8Array();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer = new Uint8Array([...buffer, ...value]);

    const lineFeed = "\n".charCodeAt(0);
    const eventEndIndices = [];
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === lineFeed && buffer[i + 1] === lineFeed) {
        eventEndIndices.push(i);
      }
    }

    for (let i = 0; i < eventEndIndices.length; i++) {
      const eventStartIndex = i === 0 ? 0 : eventEndIndices[i - 1] + 2;
      const eventEndIndex = eventEndIndices[i];
      const event = buffer.slice(eventStartIndex, eventEndIndex);
      const decodedEvent = new TextDecoder().decode(event);
      const data = decodedEvent.split("\n").at(-1);
      if (data?.startsWith("data: ")) {
        /** @type {AnthropicStreamEvent} */
        const parsedData = JSON.parse(data.slice("data: ".length));
        yield parsedData;
      }
    }

    if (eventEndIndices.length) {
      buffer = buffer.slice(eventEndIndices[eventEndIndices.length - 1] + 2);
    }
  }
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
    if (part.type === "thinking") {
      content.push({
        type: "thinking",
        thinking: part.thinking,
        providerMetadata: { signature: part.signature },
      });
    } else if (part.type === "text") {
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
