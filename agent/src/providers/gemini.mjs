/**
 * @import { ModelInput, Message, AssistantMessage, ModelOutput, PartialMessageContent, ProviderTokenUsage } from "../model";
 * @import { GeminiCachedContents, GeminiContent, GeminiContentPartFunctionCall, GeminiContentPartText, GeminiCreateCachedContentInput as GeminiCreateCachedContentInput, GeminiFunctionContent, GeminiGenerateContentInput, GeminiGeneratedContent, GeminiModelConfig, GeminiModelContent, GeminiSystemContent, GeminiToolDefinition, GeminiUserContent } from "./gemini";
 * @import { ToolDefinition } from "../tool";
 */

import { styleText } from "node:util";
import { noThrow } from "../utils/noThrow.mjs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * References:
 * - https://ai.google.dev/gemini-api/docs/caching
 * - https://ai.google.dev/api/caching
 * @param {GeminiModelConfig} modelConfig
 * @returns {typeof callGeminiModel}
 */
export function createCacheEnabledGeminiModelCaller(modelConfig) {
  const props = {
    cacheTTL: 10 * 60, // seconds
    // https://ai.google.dev/gemini-api/docs/caching#considerations
    minCacheableTokenCount: 4096,
  };

  /**
   * @typedef {Object} CacheState
   * @property {string} name
   * @property {number} contentsLength
   * @property {Date} expireTime
   */

  const state = {
    /** @type {CacheState=} */
    cache: undefined,
  };

  /** @type {typeof callGeminiModel} */
  async function modelCaller(config, input, retryCount = 0) {
    return await noThrow(async () => {
      const contents = convertGenericMessageToGeminiFormat(input.messages);
      const tools = convertGenericToolDefinitionToGeminiFormat(
        input.tools || [],
      );
      const systemInstruction = contents.find((c) => c.role === "system");
      const contentsWithoutSystem = contents.filter((c) => c.role !== "system");

      // Clear cache if messages are cleared
      if (contentsWithoutSystem.length <= 1) {
        state.cache = undefined;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

      /** @type {Pick<GeminiGenerateContentInput, "generationConfig" | "safetySettings">} */
      const baseRequest = {
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
      };

      /** @type {GeminiGenerateContentInput} */
      const request =
        state.cache && new Date().getTime() < state.cache.expireTime.getTime()
          ? {
              ...baseRequest,
              cachedContent: state.cache.name,
              contents: contentsWithoutSystem.slice(state.cache.contentsLength),
            }
          : {
              ...baseRequest,
              system_instruction: systemInstruction,
              contents: contentsWithoutSystem,
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
        console.error(
          styleText(
            "yellow",
            `Gemini rate limit exceeded. Retrying in ${interval} seconds...`,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));
        return modelCaller(config, input, retryCount + 1);
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

        const partialContents =
          convertGeminiStreamContentToAgentPartialContents(
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
        input:
          content.usageMetadata.promptTokenCount -
          (content.usageMetadata.cachedContentTokenCount ?? 0),
        cached: content.usageMetadata.cachedContentTokenCount ?? 0,
        output: content.usageMetadata.candidatesTokenCount ?? 0,
        total: content.usageMetadata.totalTokenCount,
      };

      const message = convertGeminiAssistantMessageToGenericFormat(content);
      if (message instanceof GeminiNoCandidateError) {
        const interval = Math.min(2 * 2 ** retryCount, 16);
        console.error(
          styleText(
            "yellow",
            `No candidates found in Gemini response. Retrying in ${interval} seconds...`,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));
        return modelCaller(
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

      // Create context cache for next request
      if (
        props.minCacheableTokenCount < content.usageMetadata.promptTokenCount
      ) {
        await updateCache({
          contentsWithoutSystem: [
            ...contentsWithoutSystem,
            /** @type {GeminiModelContent} */ (
              content.candidates?.at(0)?.content
            ),
          ],
          systemInstruction,
          tools,
        });
      }

      return {
        message,
        providerTokenUsage: tokenUsage,
      };
    });
  }

  /**
   * @typedef {Object} UpdateCacheParams
   * @property {(GeminiUserContent|GeminiModelContent|GeminiFunctionContent)[]} contentsWithoutSystem
   * @property {GeminiSystemContent=} systemInstruction
   * @property {GeminiToolDefinition[]=} tools
   */

  /**
   * @param {UpdateCacheParams} params
   */
  async function updateCache({
    contentsWithoutSystem,
    systemInstruction,
    tools,
  }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${GEMINI_API_KEY}`;

    /** @type {GeminiCreateCachedContentInput} */
    const request = {
      model: `models/${modelConfig.model}`,
      ttl: `${props.cacheTTL}s`,
      system_instruction: systemInstruction,
      contents: contentsWithoutSystem,
      tools,
    };

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })
      .then(async (response) => {
        if (response.status !== 200) {
          console.error(
            styleText(
              "yellow",
              `Failed to create Gemini context cache: status=${response.status}, body=${await response.text()}`,
            ),
          );
        } else {
          /** @type {GeminiCachedContents} */
          const cachedContents = await response.json();

          // Delete old cache if previous cache is alive
          if (
            state.cache &&
            new Date().getTime() < state.cache.expireTime.getTime()
          ) {
            fetch(
              `https://generativelanguage.googleapis.com/v1beta/${state.cache.name}?key=${GEMINI_API_KEY}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            )
              .then(async (response) => {
                if (response.status !== 200) {
                  console.error(
                    styleText(
                      "yellow",
                      `Failed to delete Gemini context cache: status=${response.status}, body=${await response.text()}`,
                    ),
                  );
                }
              })
              .catch((error) => {
                console.error(
                  styleText(
                    "yellow",
                    `Failed to delete Gemini context cache: ${error}`,
                  ),
                );
              });
          }

          state.cache = {
            name: cachedContents.name,
            contentsLength: contentsWithoutSystem.length,
            expireTime: new Date(cachedContents.expireTime),
          };
        }
      })
      .catch((error) => {
        console.error(
          styleText(
            "yellow",
            `Failed to create Gemini context cache: ${error}`,
          ),
        );
      });
  }

  return modelCaller;
}

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
    const contentsWithoutSystem = contents.filter((c) => c.role !== "system");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

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
      contents: contentsWithoutSystem,
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
      console.error(
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
      output: content.usageMetadata.candidatesTokenCount ?? 0,
      total: content.usageMetadata.totalTokenCount,
    };

    const message = convertGeminiAssistantMessageToGenericFormat(content);
    if (message instanceof GeminiNoCandidateError) {
      const interval = Math.min(2 * 2 ** retryCount, 16);
      console.error(
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
            role: "user",
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
