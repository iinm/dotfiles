/**
 * @import { ModelInput, Message,  MessageContentToolResult, MessageContentText, AssistantMessage, ModelOutput, PartialMessageContent, MessageContentThinking, MessageContentToolUse } from "../model"
 * @import { OpenAIAssistantMessage, OpenAIMessage, OpenAIMessageToolCall, OpenAIModelConfig, OpenAIToolDefinition, OpenAIStreamData, OpenAIChatCompletion, OpenAIMessageContentImage, OpenAIChatCompletionRequest } from "./openaiCompatible"
 * @import { ToolDefinition } from "../tool"
 * @import { GenericModelProviderConfig } from "../config"
 */

import { styleText } from "node:util";
import { noThrow } from "../utils/noThrow.mjs";

/**
 * @param {GenericModelProviderConfig} providerConfig
 * @param {OpenAIModelConfig} modelConfig
 * @param {ModelInput} input
 * @param {number} retryCount
 * @returns {Promise<ModelOutput | Error>}
 */
export async function callOpenAICompatibleModel(
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

    /** @type {OpenAIChatCompletionRequest} */
    const request = {
      ...modelConfig,
      messages,
      tools: tools.length ? tools : undefined,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    };

    const response = await fetch(`${baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        ...providerConfig.customHeaders,
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerConfig.apiKey}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(120 * 1000),
    });

    if (response.status === 429) {
      const interval = Math.min(2 * 2 ** retryCount, 16);
      console.error(
        styleText(
          "yellow",
          `OpenAI rate limit exceeded. Retry in ${interval} seconds...`,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      return callOpenAICompatibleModel(
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

    /** @type {OpenAIStreamData[]} */
    const dataList = [];
    /** @type {PartialMessageContent | undefined} */
    let previousPartialContent;
    for await (const data of readOpenAIStreamData(reader)) {
      dataList.push(data);

      const partialContents = convertOpenAIStreamDataToAgentPartialContent(
        data,
        previousPartialContent,
      );

      if (partialContents.length) {
        previousPartialContent = partialContents.at(-1);
      }

      if (input.onPartialMessageContent) {
        for (const partialContent of partialContents) {
          input.onPartialMessageContent(partialContent);
        }
      }
    }

    /** @type {OpenAIChatCompletion} */
    const chatCompletion = convertOpenAIStreamDataToChatCompletion(dataList);
    const openAIAssistantMessage = chatCompletion.choices[0].message;

    return {
      message: convertOpenAIAssistantMessageToGenericFormat(
        openAIAssistantMessage,
      ),
      providerTokenUsage: chatCompletion.usage,
    };
  });
}

/**
 * @param {Message[]} genericMessages
 * @returns {OpenAIMessage[]}
 */
function convertGenericMessageToOpenAIFormat(genericMessages) {
  /** @type {OpenAIMessage[]} */
  const openAIMessages = [];
  for (const genericMessage of genericMessages) {
    switch (genericMessage.role) {
      case "system": {
        openAIMessages.push({
          role: "system",
          content: genericMessage.content.map((part) => ({
            type: "text",
            text: part.text,
          })),
        });
        break;
      }
      case "user": {
        if (
          genericMessage.content.some((part) => part.type === "tool_result")
        ) {
          /** @type {MessageContentToolResult[]} */
          const toolResults = genericMessage.content.filter(
            (part) => part.type === "tool_result",
          );

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
            openAIMessages.push({
              role: "tool",
              tool_call_id: result.toolUseId,
              content: toolResultContentString,
            });
          }

          /** @type {OpenAIMessageContentImage[]} */
          const imageParts = [];
          for (const result of toolResults) {
            for (const part of result.content) {
              if (part.type === "image") {
                imageParts.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${part.mimeType};base64,${part.data}`,
                  },
                });
              }
            }
          }

          if (imageParts.length) {
            openAIMessages.push({
              role: "user",
              content: imageParts,
            });
          }
        } else {
          /** @type {MessageContentText[]} */
          const textParts = genericMessage.content.filter(
            (part) => part.type === "text",
          );
          openAIMessages.push({
            role: "user",
            content: textParts.map((part) => ({
              type: "text",
              text: part.text,
            })),
          });
        }
        break;
      }
      case "assistant": {
        /** @type {MessageContentThinking[]} */
        const thinkingParts = genericMessage.content.filter(
          (part) => part.type === "thinking",
        );
        if (thinkingParts.length > 1) {
          console.error(
            `OpenAI Unsupported message format: ${JSON.stringify(genericMessage)}`,
          );
        }
        const thinking = thinkingParts.map((part) => part.thinking).join("\n");

        /** @type {MessageContentText[]} */
        const textParts = genericMessage.content.filter(
          (part) => part.type === "text",
        );
        if (textParts.length > 1) {
          console.error(
            `OpenAI Unsupported message format: ${JSON.stringify(genericMessage)}`,
          );
        }
        const text = textParts.map((part) => part.text).join("\n");

        /** @type {MessageContentToolUse[]} */
        const toolUseParts = genericMessage.content.filter(
          (part) => part.type === "tool_use",
        );

        /** @type {OpenAIMessageToolCall[]} */
        const toolCalls = toolUseParts.map((part) => ({
          id: part.toolUseId,
          type: "function",
          function: {
            name: part.toolName,
            arguments: JSON.stringify(part.input),
          },
        }));

        openAIMessages.push({
          role: "assistant",
          reasoning_content: thinking ? thinking : undefined,
          content: text ? text : undefined,
          tool_calls: toolCalls.length ? toolCalls : undefined,
        });
      }
    }
  }

  return openAIMessages;
}

/**
 * @param {ToolDefinition[]} genericToolDefs
 * @returns {OpenAIToolDefinition[]}
 */
function convertGenericeToolDefinitionToOpenAIFormat(genericToolDefs) {
  /** @type {OpenAIToolDefinition[]} */
  const openAIToolDefs = [];
  for (const toolDef of genericToolDefs) {
    openAIToolDefs.push({
      type: "function",
      function: {
        name: toolDef.name,
        description: toolDef.description,
        parameters: toolDef.inputSchema,
      },
    });
  }

  return openAIToolDefs;
}

/**
 * @param {OpenAIAssistantMessage} openAIAsistantMessage
 * @returns {AssistantMessage}
 */
function convertOpenAIAssistantMessageToGenericFormat(openAIAsistantMessage) {
  /** @type {AssistantMessage["content"]} */
  const content = [];
  if (openAIAsistantMessage.reasoning_content) {
    content.push({
      type: "thinking",
      thinking: openAIAsistantMessage.reasoning_content,
    });
  }

  if (openAIAsistantMessage.content) {
    content.push({ type: "text", text: openAIAsistantMessage.content });
  }

  if (openAIAsistantMessage.tool_calls) {
    for (const toolCall of openAIAsistantMessage.tool_calls) {
      if (toolCall.type === "function") {
        content.push({
          type: "tool_use",
          toolUseId: toolCall.id,
          toolName: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
        });
      } else {
        throw new Error(
          `Unsupported tool call type: ${JSON.stringify(toolCall)}`,
        );
      }
    }
  }

  return {
    role: "assistant",
    content,
    providerMetadata: {
      originalMessage: openAIAsistantMessage,
    },
  };
}

/**
 * @param {OpenAIStreamData[]} dataList
 * @returns {OpenAIChatCompletion}
 */
function convertOpenAIStreamDataToChatCompletion(dataList) {
  const firstData = dataList.at(0);
  if (!firstData) {
    throw new Error("No data found in the stream");
  }

  const fistChoice = firstData.choices.at(0);
  if (!fistChoice) {
    throw new Error("No choice found in the first data");
  }

  const message = /** @type {OpenAIAssistantMessage} */ (fistChoice.delta);

  /** @type {Partial<OpenAIChatCompletion>} */
  const chatCompletion = {
    ...firstData,
    choices: [
      {
        index: fistChoice.index,
        message,
        finish_reason: /** @type {string} */ (fistChoice.finish_reason),
      },
    ],
  };

  for (let i = 1; i < dataList.length; i++) {
    const data = dataList[i];
    const firstChoice = data?.choices.at(0);
    if (firstChoice) {
      const delta = firstChoice.delta;

      if (delta.reasoning_content) {
        message.reasoning_content =
          (message.reasoning_content ?? "") + delta.reasoning_content;
      }

      if (delta.content) {
        message.content = (message.content ?? "") + delta.content;
      }

      if (delta.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const toolCall = message.tool_calls?.[toolCallDelta.index];
          if (!toolCall) {
            if (!message.tool_calls) {
              message.tool_calls = [];
            }
            /** @type {OpenAIMessageToolCall[]} */ (message.tool_calls).splice(
              toolCallDelta.index,
              0,
              /** @type {OpenAIMessageToolCall} */
              (toolCallDelta),
            );
          }
          if (toolCall && toolCallDelta.function) {
            toolCall.function.arguments =
              (toolCall.function.arguments ?? "") +
              toolCallDelta.function.arguments;
          }
        }
      }

      if (firstChoice.finish_reason && chatCompletion.choices) {
        chatCompletion.choices[0].finish_reason = firstChoice.finish_reason;
      }
    }

    if (data.usage) {
      chatCompletion.usage = data.usage;
    }
  }

  return /** @type {OpenAIChatCompletion} */ (chatCompletion);
}

/**
 * @param {OpenAIStreamData} data
 * @param {PartialMessageContent | undefined} previousPartialContent
 * @returns {PartialMessageContent[]}
 */
function convertOpenAIStreamDataToAgentPartialContent(
  data,
  previousPartialContent,
) {
  /** @type {PartialMessageContent[]} */
  const partialContents = [];
  const firstChoice = data.choices.at(0);

  if (firstChoice?.delta.reasoning_content) {
    partialContents.push({
      type: "thinking",
      content: firstChoice?.delta.reasoning_content,
      position: previousPartialContent?.type === "thinking" ? "delta" : "start",
    });
  }

  if (firstChoice?.delta.content) {
    partialContents.push({
      type: "text",
      content: firstChoice.delta.content,
      position: previousPartialContent?.type === "text" ? "delta" : "start",
    });
  }

  if (firstChoice?.delta.tool_calls) {
    partialContents.push({
      type: "tool_use",
      content: [
        firstChoice.delta.tool_calls.at(0)?.function?.name,
        firstChoice.delta.tool_calls.at(0)?.function?.arguments,
      ].join(" "),
      position: previousPartialContent?.type === "tool_use" ? "delta" : "start",
    });
  }

  if (firstChoice?.finish_reason) {
    partialContents.push({
      type: previousPartialContent?.type || "unknown",
      position: "stop",
    });
  }

  if (
    partialContents.length &&
    previousPartialContent &&
    partialContents[0].position !== "stop" &&
    partialContents[0].type !== previousPartialContent.type
  ) {
    partialContents.unshift({
      type: previousPartialContent.type,
      position: "stop",
    });
  }

  return partialContents;
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

    buffer = new Uint8Array([...buffer, ...value]);

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
      if (decodedData === "data: [DONE]") {
        break;
      }
      if (decodedData.startsWith("data: ")) {
        /** @type {OpenAIStreamData} */
        const parsedData = JSON.parse(decodedData.slice("data: ".length));
        yield parsedData;
      }
    }

    if (dataEndIndices.length) {
      buffer = buffer.slice(dataEndIndices[dataEndIndices.length - 1] + 2);
    }
  }
}
