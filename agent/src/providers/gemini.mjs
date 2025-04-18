/**
 * @import { ModelInput, Message, AssistantMessage, ModelOutput, PartialMessageContent, ProviderTokenUsage } from "../model";
 * @import { GeminiContent, GeminiContentPartFunctionCall, GeminiContentPartText, GeminiGenerateContentInput, GeminiGeneratedContent, GeminiModelConfig, GeminiToolDefinition } from "./gemini";
 * @import { ToolDefinition } from "../tool";
 */

import { styleText } from "node:util";
import { noThrow } from "../utils/noThrow.mjs";

const GOOGLE_AI_STUDIO_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;

/**
 * @param {GeminiModelConfig} config
 * @param {ModelInput} input
 * @param {number} retryCount
 * @returns {Promise<ModelOutput | Error>}
 */
export async function callGeminiModel(config, input, retryCount = 0) {
  return await noThrow(async () => {
    const contents = convertGenericMessageToGeminiFormat(input.messages);
    const tools = convertGenericToolDefinitionToGeminiFormat(input.tools || []);

    const systemInstruction = contents.find((c) => c.role === "system");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${GOOGLE_AI_STUDIO_API_KEY}`;
    /** @type {GeminiGenerateContentInput} */
    const request = {
      // default
      generationConfig: {
        temperature: 0,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
      ...config.requestConfig,
      system_instruction: systemInstruction,
      contents: contents.filter((c) => c.role !== "system"),
      tools: tools.length ? tools : undefined,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (response.status === 429) {
      const interval = Math.min(2 * 2 ** retryCount, 16);
      console.log(
        styleText(
          "yellow",
          `Gemini rate limit exceeded. Retrying in ${interval} seconds...`,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      return callGeminiModel(config, input, retryCount + 1);
    }

    if (response.status !== 200) {
      return new Error(
        `Failed to call Gemini model: status=${response.status}, body=${await response.text()}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();

    /** @type {GeminiGeneratedContent[]} */
    const streamContents = [];
    /** @type {PartialMessageContent | undefined} */
    let previousPartialContent = undefined;

    for await (const streamContent of readGeminiStreamContents(reader)) {
      streamContents.push(streamContent);

      const partialContents = convertGeminiStreamContentToAgentPartialContents(
        streamContent,
        previousPartialContent,
      );
      previousPartialContent = partialContents.at(-1);

      if (input.onPartialMessageContent && partialContents.length) {
        for (const partialContent of partialContents) {
          input.onPartialMessageContent(partialContent);
        }
      }
    }

    if (input.onPartialMessageContent && previousPartialContent) {
      input.onPartialMessageContent({
        type: previousPartialContent.type,
        position: "stop",
      });
    }

    /** @type {GeminiGeneratedContent} */
    const content = convertGeminiStreamContentsToContent(streamContents);

    /** @type {ProviderTokenUsage} */
    const tokenUsage = {
      input: content.usageMetadata.promptTokenCount,
      output: content.usageMetadata.candidatesTokenCount,
      total: content.usageMetadata.totalTokenCount,
    };

    const message = convertGeminiAssistantMessageToGenericFormat(content);
    if (message instanceof GeminiNoCandidateError) {
      const interval = Math.min(2 * 2 ** retryCount, 16);
      console.log(
        styleText(
          "yellow",
          `No candidates found in Gemini response. Retrying in ${interval} seconds...`,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      return callGeminiModel(
        config,
        {
          ...input,
          messages: [
            ...input.messages,
            { role: "user", content: [{ type: "text", text: "continue" }] },
          ],
        },
        retryCount + 1,
      );
    }

    return {
      message,
      providerTokenUsage: tokenUsage,
    };
  });
}

/**
 * @param {Message[]} messages
 * @returns {GeminiContent[]}
 */
function convertGenericMessageToGeminiFormat(messages) {
  /** @type {GeminiContent[]} */
  const geminiContents = [];
  for (const message of messages) {
    switch (message.role) {
      case "system": {
        geminiContents.push({
          role: "system",
          parts: message.content.map((part) => ({
            text: part.text,
          })),
        });
        break;
      }
      case "user": {
        const toolUseResults = message.content.filter(
          (part) => part.type === "tool_result",
        );
        const userTextParts = message.content.filter(
          (part) => part.type === "text",
        );

        /** @type {GeminiContent[]} */
        for (const part of toolUseResults) {
          geminiContents.push({
            role: "function",
            parts: [
              {
                functionResponse: {
                  name: part.toolName,
                  response: {
                    name: part.toolName,
                    content: part.content.map((contentPart) => {
                      switch (contentPart.type) {
                        case "text":
                          return { text: contentPart.text };
                        case "image":
                          return {
                            inline_data: {
                              mime_type: contentPart.mimeType,
                              data: contentPart.data,
                            },
                          };
                        default:
                          throw new Error(
                            `Unsupported content: ${JSON.stringify(contentPart)}`,
                          );
                      }
                    }),
                  },
                },
              },
            ],
          });
        }
        for (const part of userTextParts) {
          geminiContents.push({
            role: "user",
            parts: [{ text: part.text }],
          });
        }

        break;
      }
      case "assistant": {
        /** @type {(GeminiContentPartText | GeminiContentPartFunctionCall)[]} */
        const parts = [];
        for (const part of message.content) {
          if (part.type === "text") {
            parts.push({ text: part.text });
          } else if (part.type === "tool_use") {
            parts.push({
              functionCall: {
                name: part.toolName,
                args: part.input,
              },
            });
          } else if (part.type === "thinking") {
            parts.push({ text: `Thinking: ${part.thinking}` });
          }
        }
        geminiContents.push({
          role: "model",
          parts,
        });
        break;
      }
    }
  }

  return geminiContents;
}

/**
 * @param {ToolDefinition[]} tools
 * @returns {GeminiToolDefinition[]}
 */
function convertGenericToolDefinitionToGeminiFormat(tools) {
  /** @type {GeminiToolDefinition["functionDeclarations"]} */
  const functionDeclarations = [];
  for (const tool of tools) {
    functionDeclarations.push({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    });
  }

  return [
    {
      functionDeclarations,
    },
  ];
}

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @returns {AsyncGenerator<GeminiGeneratedContent>}
 */
async function* readGeminiStreamContents(reader) {
  let buffer = new Uint8Array();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer = new Uint8Array([...buffer, ...value]);

    const carriageReturn = "\r".charCodeAt(0);
    const lineFeed = "\n".charCodeAt(0);

    const dataEndIndices = [];
    for (let i = 0; i < buffer.length - 3; i++) {
      if (
        buffer[i] === carriageReturn &&
        buffer[i + 1] === lineFeed &&
        buffer[i + 2] === carriageReturn &&
        buffer[i + 3] === lineFeed
      ) {
        dataEndIndices.push(i);
      }
    }

    for (let i = 0; i < dataEndIndices.length; i++) {
      const dataStartIndex = i === 0 ? 0 : dataEndIndices[i - 1] + 4;
      const dataEndIndex = dataEndIndices[i];
      const data = buffer.slice(dataStartIndex, dataEndIndex);
      const decodedData = new TextDecoder().decode(data);

      if (decodedData.startsWith("data: {")) {
        /** @type {GeminiGeneratedContent} */
        const parsedData = JSON.parse(decodedData.slice("data: ".length));
        yield parsedData;
      }
    }

    if (dataEndIndices.length) {
      buffer = buffer.slice(dataEndIndices[dataEndIndices.length - 1] + 4);
    }
  }
}

/**
 * @param {GeminiGeneratedContent} event
 * @param {PartialMessageContent | undefined} previousPartialContent
 * @returns {PartialMessageContent[]}
 */
function convertGeminiStreamContentToAgentPartialContents(
  event,
  previousPartialContent,
) {
  const candiate = event.candidates?.at(0);
  /** @type {PartialMessageContent[]} */
  const partialMessageContents = [];
  if (candiate?.content.parts?.length) {
    /** @type {string | undefined} */
    let previousPartType = previousPartialContent?.type;
    for (const part of candiate.content.parts) {
      const partType = "text" in part ? "text" : "functionCall";
      if (previousPartType && previousPartType !== partType) {
        partialMessageContents.push({
          type: previousPartType,
          position: "stop",
        });
      }

      if (previousPartType !== partType) {
        previousPartType = partType;
        partialMessageContents.push({
          type: partType,
          position: "start",
        });
      }

      if ("text" in part) {
        partialMessageContents.push({
          type: "text",
          content: part.text,
          position: "delta",
        });
      }
      if ("functionCall" in part) {
        partialMessageContents.push({
          type: "tool_use",
          content: part.functionCall.name,
          position: "delta",
        });
      }
    }
  }

  return partialMessageContents;
}

/**
 * @param {GeminiGeneratedContent[]} events
 * @returns {GeminiGeneratedContent}
 */
function convertGeminiStreamContentsToContent(events) {
  const firstContent = events.at(0);
  if (!firstContent) {
    throw new Error("No content found");
  }

  /** @type {GeminiGeneratedContent} */
  const mergedContent = {
    ...firstContent,
    // avoid side effects of mutating the original object
    candidates: (firstContent.candidates || []).map((candidate) => ({
      ...candidate,
      content: {
        ...candidate.content,
        parts: [...(candidate.content.parts || [])],
      },
    })),
  };

  for (let i = 1; i < events.length; i++) {
    const event = events[i];
    if (event.candidates?.length) {
      const candidate = event.candidates.at(0);
      if (candidate?.content.parts?.length) {
        mergedContent.candidates?.[0].content.parts?.push(
          ...candidate.content.parts,
        );
      }
    }
  }

  return mergedContent;
}

class GeminiNoCandidateError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = "GeminiNoCandidateError";
  }
}

/**
 * @param {GeminiGeneratedContent} content
 * @returns {AssistantMessage | GeminiNoCandidateError}
 */
function convertGeminiAssistantMessageToGenericFormat(content) {
  const candidate = content.candidates?.at(0);
  if (!candidate) {
    return new GeminiNoCandidateError(
      `No candidates found: content=${JSON.stringify(content)}`,
    );
  }

  /** @type {AssistantMessage["content"]} */
  const assistantMessageContent = [];
  for (const part of candidate.content.parts || []) {
    if ("text" in part) {
      assistantMessageContent.push({
        type: "text",
        text: part.text,
      });
    }
    if ("functionCall" in part) {
      assistantMessageContent.push({
        type: "tool_use",
        toolUseId: part.functionCall.name,
        toolName: part.functionCall.name,
        input: part.functionCall.args,
      });
    }
  }

  return {
    role: "assistant",
    content: assistantMessageContent,
  };
}
