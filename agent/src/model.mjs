/**
 * @import { CallModel } from "./model"
 * @import { ModelProvidersConfig } from "./config";
 */

import { callAnthropicModel } from "./providers/anthropic.mjs";
import { createCacheEnabledGeminiModelCaller } from "./providers/gemini.mjs";
import { callOpenAIModel } from "./providers/openai.mjs";
import { callOpenAICompatibleModel } from "./providers/openaiCompatible.mjs";

/**
 * @param {string} modelName
 * @param {ModelProvidersConfig=} providers
 * @returns {CallModel}
 */
export function createModelCaller(modelName, providers) {
  switch (modelName) {
    case "gpt-thinking-low":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.2",
            reasoning: {
              effort: "low",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-thinking-medium":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.2",
            reasoning: {
              effort: "medium",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-thinking-high":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.2",
            reasoning: {
              effort: "high",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-thinking-xhigh":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.2",
            reasoning: {
              effort: "xhigh",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-codex-low":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.1-codex-max",
            reasoning: {
              effort: "low",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-codex-medium":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.1-codex-max",
            reasoning: {
              effort: "medium",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-codex-high":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.1-codex-max",
            reasoning: {
              effort: "high",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-codex-xhigh":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.1-codex-max",
            reasoning: {
              effort: "xhigh",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-codex-mini-low":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.1-codex-mini",
            reasoning: {
              effort: "low",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-codex-mini-medium":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.1-codex-mini",
            reasoning: {
              effort: "medium",
              summary: "auto",
            },
          },
          input,
        );
    case "gpt-codex-mini-high":
      return (input) =>
        callOpenAIModel(
          providers?.openai ?? {},
          {
            model: "gpt-5.1-codex-mini",
            reasoning: {
              effort: "high",
              summary: "auto",
            },
          },
          input,
        );
    case "claude-haiku-thinking-8k":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-haiku-4-5",
            max_tokens: 1024 * 16,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 8,
            },
          },
          input,
        );
    case "claude-haiku-thinking-16k":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-haiku-4-5",
            max_tokens: 1024 * 32,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 16,
            },
          },
          input,
        );
    case "claude-haiku-thinking-32k-max":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-haiku-4-5",
            max_tokens: 1000 * 64,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 32,
            },
          },
          input,
        );
    case "claude-sonnet-thinking-8k":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-sonnet-4-5",
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
          providers?.anthropic ?? {},
          {
            model: "claude-sonnet-4-5",
            max_tokens: 1024 * 32,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 16,
            },
          },
          input,
        );
    case "claude-sonnet-thinking-32k-max":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-sonnet-4-5",
            max_tokens: 1000 * 64,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 32,
            },
          },
          input,
        );
    case "claude-opus-thinking-8k":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-opus-4-5",
            max_tokens: 1024 * 16,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 8,
            },
          },
          input,
        );
    case "claude-opus-thinking-16k":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-opus-4-5",
            max_tokens: 1024 * 32,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 16,
            },
          },
          input,
        );
    case "claude-opus-thinking-32k-max":
      return (input) =>
        callAnthropicModel(
          providers?.anthropic ?? {},
          {
            model: "claude-opus-4-5",
            max_tokens: 1000 * 64,
            thinking: {
              type: "enabled",
              budget_tokens: 1024 * 32,
            },
          },
          input,
        );
    case "gemini-flash-thinking-low": {
      const model = "gemini-3-flash-preview";
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
                maxOutputTokens: 1024 * 16,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingLevel: "low",
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-flash-thinking-medium": {
      const model = "gemini-3-flash-preview";
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
                maxOutputTokens: 1024 * 32,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingLevel: "medium",
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-flash-thinking-high": {
      const model = "gemini-3-flash-preview";
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
                maxOutputTokens: 1024 * 48,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingLevel: "high",
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-pro-thinking-low": {
      const model = "gemini-3-pro-preview";
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
                maxOutputTokens: 1024 * 16,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingLevel: "low",
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-pro-thinking-medium": {
      const model = "gemini-3-pro-preview";
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
                maxOutputTokens: 1024 * 32,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingLevel: "medium",
                },
              },
            },
          },
          input,
        );
    }
    case "gemini-pro-thinking-high": {
      const model = "gemini-3-pro-preview";
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
                maxOutputTokens: 1024 * 64,
                thinkingConfig: {
                  includeThoughts: true,
                  thinkingLevel: "high",
                },
              },
            },
          },
          input,
        );
    }
    case "grok-fast":
      return (input) =>
        callOpenAICompatibleModel(
          providers?.xai ?? {},
          {
            model: "grok-4-1-fast-reasoning",
          },
          input,
        );
    case "grok-code":
      return (input) =>
        callOpenAICompatibleModel(
          providers?.xai ?? {},
          {
            model: "grok-code-fast-1",
          },
          input,
        );
    default:
      throw new Error(`Invalid model: "${modelName}"`);
  }
}
