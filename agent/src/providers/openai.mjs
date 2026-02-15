/**
 * @import { ModelInput, Message, AssistantMessage, ModelOutput, PartialMessageContent } from "../model"
 * @import { OpenAIInputImage, OpenAIInputItem, OpenAIModelConfig, OpenAIOutputItem, OpenAIRequest, OpenAIStreamEvent, OpenAIToolFunction } from "./openai"
 * @import { ToolDefinition } from "../tool"
 * @import { GenericModelProviderConfig } from "../config"
 */

import { styleText } from "node:util";
import { noThrow } from "../utils/noThrow.mjs";
import { getAzureAccessToken } from "./azure.mjs";

/**
 * @param {GenericModelProviderConfig} providerConfig
 * @param {OpenAIModelConfig} modelConfig
 * @param {ModelInput} input
 * @param {number} retryCount
 * @returns {Promise<ModelOutput | Error>}
 */
export async function callOpenAIModel(
  providerConfig,
  modelConfig,
  input,
  retryCount = 0,
) {
  const baseURL = providerConfig.baseURL || "https://api.openai.com";

  return await noThrow(async () => {
    const messages = convertGenericMessageToOpenAIFormat(input.messages);
    const tools = convertGenericeToolDefinitionToOpenAIFormat(
      input.tools || [],
    );

    const { model, ...baseModelConfig } = modelConfig;

    /** @type {OpenAIRequest} */
    const request = {
      ...baseModelConfig,
      model:
        providerConfig.platform === "azure"
          ? (providerConfig.modelMap?.[model] ?? model)
          : model,
      input: messages,
      tools: tools.length ? tools : undefined,
      stream: true,
    };

    const apiKey =
      providerConfig.platform === "azure"
        ? await getAzureAccessToken(
            providerConfig.azure?.azureConfigDir
              ? {
                  azureConfigDir: providerConfig.azure.azureConfigDir,
                }
              : undefined,
          )
        : providerConfig.apiKey;

    const response = await fetch(`${baseURL}/v1/responses`, {
      method: "POST",
      headers: {
        ...providerConfig.customHeaders,
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(5 * 60 * 1000),
    });

    const retryInterval = Math.min(2 * 2 ** retryCount, 16);
    if (response.status === 429 || response.status >= 500) {
      console.error(
        styleText(
          "yellow",
          `OpenAI rate limit exceeded. Retry in ${retryInterval} seconds...`,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, retryInterval * 1000));
      return callOpenAIModel(
        providerConfig,
        modelConfig,
        input,
        retryCount + 1,
      );
    }

    if (response.status !== 200) {
      throw new Error(
        `Failed to call OpenAI model: status=${response.status}, body=${await response.text()}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();

    /** @type {OpenAIStreamEvent[]} */
    const streamEvents = [];
    for await (const streamEvent of readOpenAIStreamData(reader)) {
      streamEvents.push(streamEvent);

      const partialContent =
        convertOpenAIStreamDataToAgentPartialContent(streamEvent);
      if (input.onPartialMessageContent && partialContent) {
        input.onPartialMessageContent(partialContent);
      }
    }

    const lastEvent = streamEvents.at(-1);
    if (lastEvent?.type !== "response.completed") {
      const lastEventTrimmed =
        lastEvent?.type === "response.failed"
          ? {
              type: lastEvent.type,
              response: { error: lastEvent.response.error },
            }
          : lastEvent;
      console.error(
        styleText(
          "yellow",
          `OpenAI stream did not complete: ${JSON.stringify(lastEventTrimmed)}. Retry in ${retryInterval} seconds...`,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, retryInterval * 1000));
      return callOpenAIModel(
        providerConfig,
        modelConfig,
        input,
        retryCount + 1,
      );
    }

    return {
      message: convertOpenAIAssistantMessageToGenericFormat(
        lastEvent.response.output,
      ),
      providerTokenUsage: lastEvent.response.usage,
    };
  });
}

/**
 * @param {Message[]} genericMessages
 * @returns {OpenAIInputItem[]}
 */
function convertGenericMessageToOpenAIFormat(genericMessages) {
  /** @type {OpenAIInputItem[]} */
  const openAIInputItems = [];
  for (const genericMessage of genericMessages) {
    switch (genericMessage.role) {
      case "system": {
        openAIInputItems.push({
          role: "system",
          content: genericMessage.content.map((part) => ({
            type: "input_text",
            text: part.text,
          })),
        });
        break;
      }
      case "user": {
        const toolResults = genericMessage.content.filter(
          (part) => part.type === "tool_result",
        );
        const userContentParts = genericMessage.content.filter(
          (part) => part.type === "text" || part.type === "image",
        );

        // Tool Results
        let imageIndex = 0;
        for (const result of toolResults) {
          const toolResultContentString = result.content
            .map((part) => {
              switch (part.type) {
                case "text":
                  return part.text;
                case "image":
                  imageIndex += 1;
                  return `(Image [${imageIndex}] omitted. See next message from user.)`;
                default:
                  throw new Error(
                    `Unsupported content part: ${JSON.stringify(part)}`,
                  );
              }
            })
            .join("\n\n");
          openAIInputItems.push({
            type: "function_call_output",
            call_id: result.toolUseId,
            output: toolResultContentString,
          });
        }

        /** @type {OpenAIInputImage[]} */
        const imageInputs = [];
        for (const result of toolResults) {
          for (const part of result.content) {
            if (part.type === "image") {
              imageInputs.push({
                type: "input_image",
                image_url: `data:${part.mimeType};base64,${part.data}`,
                detail: "auto",
              });
            }
          }
        }

        if (imageInputs.length) {
          openAIInputItems.push({
            role: "user",
            content: imageInputs,
          });
        }

        // User Input Parts
        if (userContentParts.length) {
          openAIInputItems.push({
            role: "user",
            content: userContentParts.map((part) => {
              if (part.type === "text") {
                return { type: "input_text", text: part.text };
              }
              if (part.type === "image") {
                return {
                  type: "input_image",
                  image_url: `data:${part.mimeType};base64,${part.data}`,
                };
              }
              throw new Error(
                `Unsupported content part: ${JSON.stringify(part)}`,
              );
            }),
          });
        }

        break;
      }
      case "assistant": {
        if (!genericMessage.provider?.source) {
          throw new Error(
            "Original message is required for assistant role but not provided.",
          );
        }
        const source = /** @type {OpenAIOutputItem[]} */ (
          genericMessage.provider.source
        );
        openAIInputItems.push(...source);
      }
    }
  }

  return openAIInputItems;
}

/**
 * @param {ToolDefinition[]} genericToolDefs
 * @returns {OpenAIToolFunction[]}
 */
function convertGenericeToolDefinitionToOpenAIFormat(genericToolDefs) {
  /** @type {OpenAIToolFunction[]} */
  const openAIToolDefs = [];
  for (const toolDef of genericToolDefs) {
    openAIToolDefs.push({
      type: "function",
      name: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.inputSchema,
    });
  }

  return openAIToolDefs;
}

/**
 * @param {OpenAIOutputItem[]} openAIOutputItems
 * @returns {AssistantMessage}
 */
function convertOpenAIAssistantMessageToGenericFormat(openAIOutputItems) {
  /** @type {AssistantMessage["content"]} */
  const content = [];
  for (const item of openAIOutputItems) {
    if (item.type === "reasoning") {
      content.push({
        type: "thinking",
        thinking: item.summary.text,
      });
    }

    if (item.type === "message") {
      for (const part of item.content) {
        if (part.type === "output_text") {
          content.push({
            type: "text",
            text: part.text,
          });
        }
      }
    }

    if (item.type === "function_call") {
      content.push({
        type: "tool_use",
        toolUseId: item.call_id,
        toolName: item.name,
        input: JSON.parse(item.arguments),
      });
    }
  }

  return {
    role: "assistant",
    content,
    provider: {
      // Keep the original message because converting from generic to provider format is complex.
      source: openAIOutputItems,
    },
  };
}

/**
 * @param {OpenAIStreamEvent} streamEvent
 * @returns {PartialMessageContent | undefined}
 */
function convertOpenAIStreamDataToAgentPartialContent(streamEvent) {
  // thinking
  if (streamEvent.type === "response.reasoning_summary_part.added") {
    return {
      type: "thinking",
      position: "start",
    };
  }

  if (streamEvent.type === "response.reasoning_summary_text.delta") {
    return {
      type: "thinking",
      position: "delta",
      content: streamEvent.delta,
    };
  }

  if (streamEvent.type === "response.reasoning_summary_text.done") {
    return {
      type: "thinking",
      position: "stop",
    };
  }

  // text
  if (streamEvent.type === "response.content_part.added") {
    if (streamEvent.part.type === "output_text") {
      return {
        type: "text",
        position: "start",
        content: streamEvent.part.text,
      };
    }
    if (streamEvent.part.type === "refusal") {
      return {
        type: "refusal",
        position: "start",
        content: streamEvent.part.refusal,
      };
    }
  }

  if (streamEvent.type === "response.output_text.delta") {
    return {
      type: "text",
      position: "delta",
      content: streamEvent.delta,
    };
  }

  if (streamEvent.type === "response.content_part.done") {
    if (streamEvent.part.type === "output_text") {
      return {
        type: "text",
        position: "stop",
      };
    }
    if (streamEvent.part.type === "refusal") {
      return {
        type: "refusal",
        position: "stop",
      };
    }
  }

  // tool
  if (streamEvent.type === "response.output_item.added") {
    if (streamEvent.item.type === "function_call") {
      return {
        type: "tool_use",
        position: "start",
        content: streamEvent.item.arguments,
      };
    }
  }

  if (streamEvent.type === "response.function_call_arguments.delta") {
    return {
      type: "tool_use",
      position: "delta",
      content: streamEvent.delta,
    };
  }

  if (streamEvent.type === "response.output_item.done") {
    if (streamEvent.item.type === "function_call") {
      return {
        type: "tool_use",
        position: "stop",
      };
    }
  }
}

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
async function* readOpenAIStreamData(reader) {
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
    const dataEndIndices = [];
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === lineFeed && buffer[i + 1] === lineFeed) {
        dataEndIndices.push(i);
      }
    }

    for (let i = 0; i < dataEndIndices.length; i++) {
      const dataStartIndex = i === 0 ? 0 : dataEndIndices[i - 1] + 2;
      const dataEndIndex = dataEndIndices[i];
      const data = buffer.slice(dataStartIndex, dataEndIndex);
      const decodedData = new TextDecoder().decode(data);
      if (decodedData.startsWith("event: ")) {
        const eventDate = decodedData.split("\n").slice(1).join("\n");
        /** @type {OpenAIStreamEvent} */
        const parsedData = JSON.parse(eventDate.slice("data: ".length));
        yield parsedData;
      }
    }

    if (dataEndIndices.length) {
      buffer = buffer.slice(dataEndIndices[dataEndIndices.length - 1] + 2);
    }
  }
}
