/**
 * @import { CallModel } from "./model"
 */

import { callAnthropicModel } from "./providers/anthropic.mjs";
import { callGeminiModel } from "./providers/gemini.mjs";
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
            model: "claude-3-7-sonnet-latest",
            max_tokens: 1024 * 8,
            temperature: 0,
          },
          input,
        );
    case "claude-sonnet-thinking":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-3-7-sonnet-latest",
            max_tokens: 1024 * 8,
            thinking: {
              type: "enabled",
              budget_tokens: 1024,
            },
          },
          input,
        );
    case "gemini-pro":
      return (input) =>
        callGeminiModel(
          {
            model: "gemini-2.5-pro-preview-03-25",
            // model: "gemini-2.5-pro-exp-03-25",
          },
          input,
        );
    default:
      throw new Error(`Invalid model: ${modelName}`);
  }
}
