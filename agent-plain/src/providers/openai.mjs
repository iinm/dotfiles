/**
 * @import { ModelInput, Message,  MessageContentToolResult, MessageContentText, AssistantMessage } from "../model"
 * @import { OpenAIAssistantMessage, OpenAIChatCompletion, OpenAIMessage, OpenAIModelConfig, OpenAIToolDefinition } from "./openai"
 * @import { ToolDefinition } from "../tool"
 */

import { noThrow } from "../utils/noThrow.mjs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * @param {OpenAIModelConfig} config
 * @param {ModelInput} input
 * @returns {Promise<Message | Error>}
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
      }),
    });

    if (response.status !== 200) {
      throw new Error(
        `Failed to call OpenAI model: status=${response.status}, body=${await response.text()}`,
      );
    }

    /** @type {OpenAIChatCompletion} */
    const body = await response.json();
    const openAIAssistantMessage = body.choices[0].message;

    return convertOpenAIAssistantMessageToGenericFormat(openAIAssistantMessage);
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
        for (const part of genericMessage.content) {
          if (part.type === "text") {
            openAIMessages.push({
              role: "assistant",
              content: part.text,
            });
          } else if (part.type === "tool_use") {
            openAIMessages.push({
              role: "assistant",
              tool_calls: [
                {
                  id: part.toolUseId,
                  type: "function",
                  function: {
                    name: part.toolName,
                    arguments: JSON.stringify(part.args),
                  },
                },
              ],
            });
          }
        }
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
          args: JSON.parse(toolCall.function.arguments),
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
