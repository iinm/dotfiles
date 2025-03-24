/**
 * @import { ModelInput, Message,  MessageContentToolResult, MessageContentText, AssistantMessage, MessageContentToolUse, ModelOutput, PartialMessageContent } from "../model"
 * @import { OpenAIAssistantMessage, OpenAIMessage, OpenAIMessageToolCall, OpenAIModelConfig, OpenAIToolDefinition, OpenAIStreamData, OpenAIChatCompletion } from "./openai"
 * @import { ToolDefinition } from "../tool"
 */

import { noThrow } from "../utils/noThrow.mjs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * @param {OpenAIModelConfig} config
 * @param {ModelInput} input
 * @returns {Promise<ModelOutput | Error>}
 */
export async function callOpenAIModel(config, input) {
  return await noThrow(async () => {
    const messages = convertGenericMessageToOpenAIFormat(input.messages);
    const tools = convertGenericeToolDefinitionToOpenAIFormat(
      input.tools || [],
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        ...config,
        messages,
        tools: tools.length ? tools : undefined,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      }),
    });

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
    let partialContent = undefined;
    for await (const data of readOpenAIStreamData(reader)) {
      dataList.push(data);

      partialContent = convertOpenAIStreamDataToAgentPartialContent(
        data,
        partialContent,
      );

      if (input.onPartialMessageContent && partialContent) {
        input.onPartialMessageContent(partialContent);
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
 * @param {OpenAIStreamData} data
 * @param {PartialMessageContent | undefined} partialContent
 * @returns {PartialMessageContent | undefined}
 */
function convertOpenAIStreamDataToAgentPartialContent(data, partialContent) {
  const firstChoice = data.choices.at(0);
  const isStart = Boolean(firstChoice?.delta.role);
  if (isStart && firstChoice?.delta.content === "") {
    return {
      type: "text",
      position: "start",
    };
  }
  if (!isStart && firstChoice?.delta.content) {
    return {
      type: "text",
      content: firstChoice?.delta.content,
      position: "delta",
    };
  }
  if (isStart && firstChoice?.delta.tool_calls) {
    return {
      type: "tool_use",
      content: [
        firstChoice.delta.tool_calls.at(0)?.function?.name,
        firstChoice.delta.tool_calls.at(0)?.function?.arguments,
      ].join(" "),
      position: "start",
    };
  }
  if (!isStart && firstChoice?.delta.tool_calls) {
    return {
      type: "tool_use",
      content: firstChoice.delta.tool_calls.at(0)?.function?.arguments,
      position: "delta",
    };
  }
  if (firstChoice?.finish_reason) {
    return {
      type: partialContent?.type || "unknown",
      position: "stop",
    };
  }
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

  /** @type {Partial<OpenAIChatCompletion>} */
  const chatCompletion = {
    ...firstData,
    choices: [
      {
        index: fistChoice.index,
        message: /** @type {OpenAIAssistantMessage} */ (fistChoice.delta),
        finish_reason: /** @type {string} */ (fistChoice.finish_reason),
      },
    ],
  };
  for (let i = 1; i < dataList.length; i++) {
    const data = dataList[i];
    const firstChoice = data?.choices.at(0);
    if (firstChoice) {
      const delta = firstChoice.delta;
      if (
        "content" in delta &&
        delta.content &&
        chatCompletion.choices?.[0].message
      ) {
        chatCompletion.choices[0].message.content += delta.content;
      }

      if ("tool_calls" in delta && delta.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const toolCall =
            chatCompletion.choices?.[0].message.tool_calls?.[
              toolCallDelta.index
            ];
          if (toolCall && toolCallDelta.function) {
            toolCall.function.arguments += toolCallDelta.function.arguments;
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
          const toolResultParts = genericMessage.content.filter(
            (part) => part.type === "tool_result",
          );
          for (const result of toolResultParts) {
            openAIMessages.push({
              role: "tool",
              tool_call_id: result.toolUseId,
              content: result.content,
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
          content: text ? text : undefined,
          tool_calls: toolCalls.length ? toolCalls : undefined,
        });
      }
    }
  }

  return openAIMessages;
}

/**
 * @param {OpenAIAssistantMessage} openAIAsistantMessage
 * @returns {AssistantMessage}
 */
function convertOpenAIAssistantMessageToGenericFormat(openAIAsistantMessage) {
  /** @type {AssistantMessage["content"]} */
  const content = [];
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
  };
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
