/**
 * @import { ModelInput, ChatMessage, ChatMessageContent } from "../chat"
 * @import { OpenAIChatCompletion, OpenAIChatMessage, OpenAIChatMessageContent, OpenAIChatTool, OpenAIChatToolCall, OpenAIModelConfig } from "./openai"
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * @param {OpenAIModelConfig} config
 * @param {ModelInput} input
 * @returns {Promise<ChatMessage | Error>}
 */
export async function callOpenAIModel(config, input) {
  // Convert generic message format to OpenAI format
  /** @type {OpenAIChatMessage[]} */
  const messages = [];
  for (const genericMessage of input.messages) {
    /** @type {OpenAIChatMessageContent[]} */
    const content = [];
    /** @type {OpenAIChatToolCall[]} */
    const toolCalls = [];
    for (const part of genericMessage.content) {
      if (part.type === "text") {
        content.push({ type: "text", text: part.text });
      } else if (part.type === "tool_use") {
        toolCalls.push({
          id: part.toolUseId,
          type: "function",
          function: {
            name: part.toolName,
            arguments: JSON.stringify(part.args),
          },
        });
      } else if (part.type === "tool_result") {
        messages.push({
          role: "tool",
          tool_call_id: part.toolUseId,
          content: part.content,
        });
      }
    }
    if (content.length || toolCalls.length) {
      messages.push({
        role: genericMessage.role,
        content: content.length ? content : undefined,
        tool_calls: toolCalls.length ? toolCalls : undefined,
      });
    }
  }

  // Convert generic tool format to OpenAI format
  /** @type {OpenAIChatTool[]} */
  const tools = [];
  if (input.tools) {
    for (const tool of input.tools) {
      tools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      });
    }
  }

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
  const rawMessage = body.choices[0].message;

  // Convert OpenAI format to generic message format
  /** @type {ChatMessageContent[]} */
  const content = [];
  if (typeof rawMessage.content === "string") {
    content.push({ type: "text", text: rawMessage.content });
  } else if (Array.isArray(rawMessage.content)) {
    for (const part of rawMessage.content) {
      if (part.type === "text") {
        content.push({ type: "text", text: part.text });
      } else {
        throw new Error(
          `Unsupported message part type: ${JSON.stringify(part)}`,
        );
      }
    }
  }

  if (Array.isArray(rawMessage.tool_calls)) {
    for (const toolCall of rawMessage.tool_calls) {
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

  /** @type {ChatMessage} */
  const message = {
    role: "assistant",
    content: content,
  };

  return message;
}
