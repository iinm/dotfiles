/**
 * @import { CallModel } from "./model"
 * @import { AgentModelProviders } from "./config";
 */

import { callAnthropicModel } from "./providers/anthropic.mjs";
import { createCacheEnabledGeminiModelCaller } from "./providers/gemini.mjs";
import { callOpenAIModel } from "./providers/openai.mjs";

/**
 * @param {string} modelName
 * @param {AgentModelProviders=} providers
 * @returns {CallModel}
 */
export function createModelCaller(modelName, providers) {
  switch (modelName) {
    case "gpt-4-1-mini":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-4.1-mini",
            temperature: 0,
          },
          input,
        );
    case "gpt-4-1":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-4.1",
            temperature: 0,
          },
          input,
        );
    case "o4-mini-medium":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "o4-mini",
            reasoning_effort: "medium",
          },
          input,
        );
    case "o4-mini-high":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "o4-mini",
            reasoning_effort: "high",
          },
          input,
        );
    case "o3-medium":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "o3",
            reasoning_effort: "medium",
          },
          input,
        );
    case "o3-high":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "o3",
            reasoning_effort: "high",
          },
          input,
        );
    case "claude-haiku":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-3-5-haiku-latest",
            max_tokens: 1024 * 8,
            temperature: 0,
          },
          input,
        );
    case "claude-sonnet-thinking-2k":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024 * 16,
            thinking: {
              type: "enabled",
              budget_tokens: 2024,
            },
          },
          input,
        );
    case "claude-sonnet-thinking-8k":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
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
    case "claude-sonnet-thinking-32k-max":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000 * 64,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 32,
            },
          },
          input,
        );
    case "gemini-flash-thinking": {
      const model = "gemini-2.5-flash";
      const modelCaller = createCacheEnabledGeminiModelCaller(
        providers?.gemini ?? {},
        { model },
      );
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024 * 48,
                thinkingConfig: {
                  includeThoughts: true,
                  // dynamic thinking
                  thinkingBudget: -1,
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-flash-thinking-4k": {
      const model = "gemini-2.5-flash";
      const modelCaller = createCacheEnabledGeminiModelCaller(
        providers?.gemini ?? {},
        { model },
      );
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024 * 8,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingBudget: 1024 * 4,
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-flash-thinking-16k": {
      const model = "gemini-2.5-flash";
      const modelCaller = createCacheEnabledGeminiModelCaller(
        providers?.gemini ?? {},
        { model },
      );
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024 * 32,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingBudget: 1024 * 16,
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-flash-thinking-24k-max": {
      const model = "gemini-2.5-flash";
      const modelCaller = createCacheEnabledGeminiModelCaller(
        providers?.gemini ?? {},
        { model },
      );
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024 * 48,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingBudget: 1024 * 24,
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-pro-thinking": {
      const model = "gemini-2.5-pro";
      const modelCaller = createCacheEnabledGeminiModelCaller(
        providers?.gemini ?? {},
        { model },
      );
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024 * 64,
                thinkingConfig: {
                  includeThoughts: true,
                  // dynamic thinking
                  thinkingBudget: -1,
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-pro-thinking-2k": {
      const model = "gemini-2.5-pro";
      const modelCaller = createCacheEnabledGeminiModelCaller(
        providers?.gemini ?? {},
        { model },
      );
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024 * 8,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingBudget: 1024 * 2,
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-pro-thinking-8k": {
      const model = "gemini-2.5-pro";
      const modelCaller = createCacheEnabledGeminiModelCaller(
        providers?.gemini ?? {},
        { model },
      );
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024 * 32,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingBudget: 1024 * 8,
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-pro-thinking-32k-max": {
      const model = "gemini-2.5-pro";
      const modelCaller = createCacheEnabledGeminiModelCaller(
        providers?.gemini ?? {},
        { model },
      );
      return (input) =>
        modelCaller(
          {
            model,
            requestConfig: {
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024 * 64,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingBudget: 1024 * 32,
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
