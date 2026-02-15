/**
 * @import { ModelInput, Message, AssistantMessage, ModelOutput, PartialMessageContent } from "../model";
 * @import { AnthropicChatCompletion, AnthropicMessage, AnthropicToolDefinition, AnthropicModelConfig, AnthropicAssistantMessage, AnthropicStreamEvent, AnthropicAssistantMessageContent, AnthropicChatCompletionUsage, AnthropicRequestInput } from "./anthropic";
 * @import { ToolDefinition } from "../tool";
 * @import { GenericModelProviderConfig } from "../config"
 */

import { styleText } from "node:util";
import { Sha256 } from "@aws-crypto/sha256-js";
import { fromIni } from "@aws-sdk/credential-providers";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import { noThrow } from "../utils/noThrow.mjs";
import { readBedrockStreamEvents } from "./bedrock.mjs";
import { getGoogleCloudAccessToken } from "./googleCloud.mjs";

/**
 * @param {GenericModelProviderConfig} providerConfig
 * @param {AnthropicModelConfig} modelConfig
 * @param {ModelInput} input
 * @param {number} [retryCount]
 * @returns {Promise<ModelOutput | Error>}
 */
export async function callAnthropicModel(
  providerConfig,
  modelConfig,
  input,
  retryCount = 0,
) {
  const baseURL = providerConfig.baseURL || "https://api.anthropic.com";

  return await noThrow(async () => {
    const messages = convertGenericMessageToAnthropicFormat(input.messages);
    const cacheEnabledMessages = enableContextCaching(messages);
    const tools = convertGenericToolDefinitionToAnthropicFormat(
      input.tools || [],
    );

    const url =
      providerConfig.platform === "bedrock"
        ? `${baseURL}/model/${providerConfig.modelMap?.[modelConfig.model] ?? modelConfig.model}/invoke-with-response-stream`
        : providerConfig.platform === "vertex-ai"
          ? `${baseURL}/publishers/anthropic/models/${providerConfig.modelMap?.[modelConfig.model]}:streamRawPredict`
          : `${baseURL}/v1/messages`;

    /** @type {Record<string,string>} */
    const headers =
      providerConfig.platform === "bedrock"
        ? {
            ...providerConfig.customHeaders,
            ...(providerConfig.apiKey
              ? {
                  Authorization: `Bearer ${providerConfig.apiKey}`,
                }
              : {}),
          }
        : providerConfig.platform === "vertex-ai"
          ? {
              ...providerConfig.customHeaders,
              Authorization: `Bearer ${await getGoogleCloudAccessToken()}`,
            }
          : {
              ...providerConfig.customHeaders,
              "anthropic-version": "2023-06-01",
              "x-api-key": `${providerConfig.apiKey}`,
            };

    const { model: _, ...modelConfigWithoutName } = modelConfig;
    const platformRequest =
      providerConfig.platform === "bedrock"
        ? {
            anthropic_version: "bedrock-2023-05-31",
            ...modelConfigWithoutName,
          }
        : providerConfig.platform === "vertex-ai"
          ? {
              anthropic_version: "vertex-2023-10-16",
              stream: true,
              ...modelConfigWithoutName,
            }
          : {
              ...modelConfig,
              stream: true,
            };

    /** @type {AnthropicRequestInput} */
    const request = {
      ...platformRequest,
      system: messages
        .filter((m) => m.role === "system")
        .flatMap((m) => m.content),
      messages: cacheEnabledMessages.filter((m) => m.role !== "system"),
      tools: tools.length ? tools : undefined,
    };

    const runFetchDefault = async () =>
      fetch(url, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(120 * 1000),
      });

    // bedrock + sso profile
    const runFetchForBedrock = async () => {
      const region =
        baseURL.match(/bedrock-runtime\.([\w-]+)\.amazonaws\.com/)?.[1] ?? "";
      const urlParsed = new URL(url);
      const { hostname, pathname } = urlParsed;

      const signer = new SignatureV4({
        credentials: fromIni({
          profile: providerConfig.bedrock?.awsProfile ?? "",
        }),
        region,
        service: "bedrock",
        sha256: Sha256,
      });

      const req = new HttpRequest({
        protocol: "https:",
        method: "POST",
        hostname,
        path: pathname,
        headers: {
          host: hostname,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const signed = await signer.sign(req);

      return fetch(url, {
        method: signed.method,
        headers: signed.headers,
        body: signed.body,
        signal: AbortSignal.timeout(120 * 1000),
      });
    };

    const runFetch =
      providerConfig.platform === "bedrock" &&
      providerConfig.bedrock?.awsProfile
        ? runFetchForBedrock
        : runFetchDefault;

    const response = await runFetch();

    if (response.status === 429 || response.status >= 500) {
      const interval = Math.min(2 * 2 ** retryCount, 16);
      console.error(
        styleText(
          "yellow",
          `Anthropic rate limit exceeded. Retry in ${interval} seconds...`,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      return callAnthropicModel(
        providerConfig,
        modelConfig,
        input,
        retryCount + 1,
      );
    }

    if (response.status !== 200) {
      return new Error(
        `Failed to call Anthropic model: status=${response.status}, body=${await response.text()}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();
    const eventStreamReader =
      providerConfig.platform === "bedrock"
        ? /** @type {typeof readAnthropicStreamEvents} */ (
            readBedrockStreamEvents
          )
        : readAnthropicStreamEvents;

    /** @type {AnthropicStreamEvent[]} */
    const events = [];
    /** @type {PartialMessageContent | undefined} */
    let previousPartialContent;
    for await (const event of eventStreamReader(reader)) {
      events.push(event);

      const partialContent = convertAnthropicStreamEventToAgentPartialContent(
        event,
        previousPartialContent,
      );

      if (partialContent) {
        previousPartialContent = partialContent;
      }

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
            throw new Error(
              `Unsupported content part: ${JSON.stringify(part)}`,
            );
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
            if (part.type === "image") {
              return {
                type: "image",
                source: {
                  type: "base64",
                  media_type: part.mimeType,
                  data: part.data,
                },
              };
            }
            if (part.type === "tool_result") {
              return {
                type: "tool_result",
                tool_use_id: part.toolUseId,
                content: part.content.map((contentPart) => {
                  switch (contentPart.type) {
                    case "text":
                      return { type: "text", text: contentPart.text };
                    case "image":
                      return {
                        type: "image",
                        source: {
                          type: "base64",
                          media_type: contentPart.mimeType,
                          data: contentPart.data,
                        },
                      };
                    default:
                      throw new Error(
                        `Unsupported content part: ${JSON.stringify(contentPart)}`,
                      );
                  }
                }),
                is_error: part.isError,
              };
            }
            throw new Error(
              `Unsupported content part: ${JSON.stringify(part)}`,
            );
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
                part.provider?.fields?.signature
              );
              return {
                type: "thinking",
                thinking: part.thinking,
                signature,
              };
            }
            if (part.type === "redacted_thinking") {
              const data = /** @type {string} */ (part.provider?.fields?.data);
              return {
                type: "redacted_thinking",
                data,
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
        provider: { fields: { signature: part.signature } },
      });
    } else if (part.type === "redacted_thinking") {
      content.push({
        type: "redacted_thinking",
        provider: { fields: { data: part.data } },
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
      if (event.usage?.output_tokens) {
        const usage = /** @type {AnthropicChatCompletionUsage} */ (
          chatCompletion.usage || {}
        );
        usage.output_tokens += event.usage.output_tokens;
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
        console.error(
          `Received content block delta without a content block: ${JSON.stringify(event)}`,
        );
      }
    } else if (event.type === "content_block_stop") {
      const lastContentPart = chatCompletion.content?.at(-1);
      if (lastContentPart?.type === "tool_use") {
        lastContentPart.input = JSON.parse(
          toolUseInputJsonBuffer.join("") || "{}",
        );
        toolUseInputJsonBuffer.length = 0;
      }
    }
  }

  return /** @type {AnthropicChatCompletion} */ (chatCompletion);
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

    const nextBuffer = new Uint8Array(buffer.length + value.length);
    nextBuffer.set(buffer);
    nextBuffer.set(value, buffer.length);
    buffer = nextBuffer;

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
