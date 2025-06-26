/**
 * @import { CallModel } from "./model"
 */

import { callAnthropicModel } from "./providers/anthropic.mjs";
import {
  callGeminiModel,
  createCacheEnabledGeminiModelCaller,
} from "./providers/gemini.mjs";
import { callOpenAIModel } from "./providers/openai.mjs";

/**
 * @param {string} modelName
 * @returns {CallModel}
 */
export function createModelCaller(modelName) {
  switch (modelName) {
    case "gpt-4.1-mini":
      return (input) =>
        callOpenAIModel(
          {
            model: "gpt-4.1-mini",
            temperature: 0,
          },
          input,
        );
    case "gpt-4.1":
      return (input) =>
        callOpenAIModel(
          {
            model: "gpt-4.1",
            temperature: 0,
          },
          input,
        );
    case "o4-mini-medium":
      return (input) =>
        callOpenAIModel(
          {
            model: "o4-mini",
            reasoning_effort: "medium",
          },
          input,
        );
    case "o4-mini-high":
      return (input) =>
        callOpenAIModel(
          {
            model: "o4-mini",
            reasoning_effort: "high",
          },
          input,
        );
    case "o3-medium":
      return (input) =>
        callOpenAIModel(
          {
            model: "o3",
            reasoning_effort: "medium",
          },
          input,
        );
    case "o3-high":
      return (input) =>
        callOpenAIModel(
          {
            model: "o3",
            reasoning_effort: "high",
          },
          input,
        );
    case "claude-haiku":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-3-5-haiku-latest",
            max_tokens: 1024 * 8,
            temperature: 0,
          },
          input,
        );
    case "claude-sonnet":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024 * 16,
            temperature: 0,
          },
          input,
        );
    case "claude-sonnet-thinking":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024 * 16,
            thinking: {
              type: "enabled",
              budget_tokens: 1024,
            },
          },
          input,
        );
    case "claude-sonnet-thinking-4k":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024 * 16,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 4,
            },
          },
          input,
        );
    case "claude-sonnet-thinking-8k":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024 * 16,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 8,
            },
          },
          input,
        );
    case "claude-sonnet-thinking-16k":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024 * 32,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 16,
            },
          },
          input,
        );
    case "claude-sonnet-thinking-32k":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024 * 48,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 32,
            },
          },
          input,
        );
    case "gemini-flash":
      return (input) =>
        callGeminiModel(
          {
            model: "gemini-2.5-flash",
          },
          input,
        );
    case "gemini-pro":
      return (input) =>
        callGeminiModel(
          {
            model: "gemini-2.5-pro",
          },
          input,
        );
    case "gemini-pro-cached": {
      const model = "gemini-2.5-pro";
      const modelCaller = createCacheEnabledGeminiModelCaller({ model });
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingBudget: 2048,
                },
              },
            },
          },
          input,
        );
    }
    default:
      throw new Error(`Invalid model: ${modelName}`);
  }
}
