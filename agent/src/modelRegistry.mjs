/**
 * @import { CallModel } from "./model"
 * @import { ModelProvidersConfig } from "./config";
 */

import { callAnthropicModel } from "./providers/anthropic.mjs";
import { createCacheEnabledGeminiModelCaller } from "./providers/gemini.mjs";
import { callOpenAIModel } from "./providers/openai.mjs";
import { callOpenAICompatibleModel } from "./providers/openaiCompatible.mjs";

/**
 * @typedef {Object} ModelRegistryEntry
 * @property {string} provider - プロバイダー名
 * @property {Function} caller - モデル呼び出し関数
 * @property {Object} params - モデル固有のパラメータ
 * @property {string} [geminiModel] - Geminiモデルの場合のモデル名（内部使用）
 */

/**
 * モデル名から設定を取得するレジストリ
 * @type {Record<string, ModelRegistryEntry>}
 */
export const MODEL_REGISTRY = {
  // OpenAI - GPT models
  "gpt-thinking-low": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.2",
      reasoning: { effort: "low", summary: "auto" },
    },
  },
  "gpt-thinking-medium": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.2",
      reasoning: { effort: "medium", summary: "auto" },
    },
  },
  "gpt-thinking-high": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.2",
      reasoning: { effort: "high", summary: "auto" },
    },
  },
  "gpt-thinking-xhigh": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.2",
      reasoning: { effort: "xhigh", summary: "auto" },
    },
  },
  "gpt-codex-low": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.3-codex",
      reasoning: { effort: "low", summary: "auto" },
    },
  },
  "gpt-codex-medium": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.3-codex",
      reasoning: { effort: "medium", summary: "auto" },
    },
  },
  "gpt-codex-high": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.3-codex",
      reasoning: { effort: "high", summary: "auto" },
    },
  },
  "gpt-codex-xhigh": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.3-codex",
      reasoning: { effort: "xhigh", summary: "auto" },
    },
  },
  "gpt-codex-mini-low": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.1-codex-mini",
      reasoning: { effort: "low", summary: "auto" },
    },
  },
  "gpt-codex-mini-medium": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.1-codex-mini",
      reasoning: { effort: "medium", summary: "auto" },
    },
  },
  "gpt-codex-mini-high": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.1-codex-mini",
      reasoning: { effort: "high", summary: "auto" },
    },
  },
  "gpt-chat": {
    provider: "openai",
    caller: callOpenAIModel,
    params: {
      model: "gpt-5.2-chat-latest",
      reasoning: { effort: "medium", summary: "auto" },
    },
  },

  // Anthropic - Claude models
  "claude-haiku-thinking-8k": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-haiku-4-5",
      max_tokens: 1024 * 16,
      thinking: { type: "enabled", budget_tokens: 1024 * 8 },
    },
  },
  "claude-haiku-thinking-16k": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-haiku-4-5",
      max_tokens: 1024 * 32,
      thinking: { type: "enabled", budget_tokens: 1024 * 16 },
    },
  },
  "claude-haiku-thinking-32k-max": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-haiku-4-5",
      max_tokens: 1000 * 64,
      thinking: { type: "enabled", budget_tokens: 1024 * 32 },
    },
  },
  "claude-sonnet-thinking-8k": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-sonnet-4-6",
      max_tokens: 1024 * 16,
      thinking: { type: "enabled", budget_tokens: 1024 * 8 },
    },
  },
  "claude-sonnet-thinking-16k": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-sonnet-4-5",
      max_tokens: 1024 * 32,
      thinking: { type: "enabled", budget_tokens: 1024 * 16 },
    },
  },
  "claude-sonnet-thinking-32k-max": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-sonnet-4-5",
      max_tokens: 1000 * 64,
      thinking: { type: "enabled", budget_tokens: 1024 * 32 },
    },
  },
  "claude-opus-thinking-8k": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-opus-4-6",
      max_tokens: 1024 * 16,
      thinking: { type: "enabled", budget_tokens: 1024 * 8 },
    },
  },
  "claude-opus-thinking-16k": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-opus-4-6",
      max_tokens: 1024 * 32,
      thinking: { type: "enabled", budget_tokens: 1024 * 16 },
    },
  },
  "claude-opus-thinking-32k-max": {
    provider: "anthropic",
    caller: callAnthropicModel,
    params: {
      model: "claude-opus-4-6",
      max_tokens: 1000 * 64,
      thinking: { type: "enabled", budget_tokens: 1024 * 32 },
    },
  },

  // Google - Gemini models
  "gemini-flash-thinking-low": {
    provider: "gemini",
    caller: createCacheEnabledGeminiModelCaller,
    geminiModel: "gemini-3-flash-preview",
    params: {
      requestConfig: {
        generationConfig: {
          maxOutputTokens: 1024 * 16,
          thinkingConfig: { includeThoughts: true, thinkingLevel: "low" },
        },
      },
    },
  },
  "gemini-flash-thinking-medium": {
    provider: "gemini",
    caller: createCacheEnabledGeminiModelCaller,
    geminiModel: "gemini-3-flash-preview",
    params: {
      requestConfig: {
        generationConfig: {
          maxOutputTokens: 1024 * 32,
          thinkingConfig: { includeThoughts: true, thinkingLevel: "medium" },
        },
      },
    },
  },
  "gemini-flash-thinking-high": {
    provider: "gemini",
    caller: createCacheEnabledGeminiModelCaller,
    geminiModel: "gemini-3-flash-preview",
    params: {
      requestConfig: {
        generationConfig: {
          maxOutputTokens: 1024 * 48,
          thinkingConfig: { includeThoughts: true, thinkingLevel: "high" },
        },
      },
    },
  },
  "gemini-pro-thinking-low": {
    provider: "gemini",
    caller: createCacheEnabledGeminiModelCaller,
    geminiModel: "gemini-3.1-pro-preview",
    params: {
      requestConfig: {
        generationConfig: {
          maxOutputTokens: 1024 * 16,
          thinkingConfig: { includeThoughts: true, thinkingLevel: "low" },
        },
      },
    },
  },
  "gemini-pro-thinking-medium": {
    provider: "gemini",
    caller: createCacheEnabledGeminiModelCaller,
    geminiModel: "gemini-3.1-pro-preview",
    params: {
      requestConfig: {
        generationConfig: {
          maxOutputTokens: 1024 * 32,
          thinkingConfig: { includeThoughts: true, thinkingLevel: "medium" },
        },
      },
    },
  },
  "gemini-pro-thinking-high": {
    provider: "gemini",
    caller: createCacheEnabledGeminiModelCaller,
    geminiModel: "gemini-3.1-pro-preview",
    params: {
      requestConfig: {
        generationConfig: {
          maxOutputTokens: 1024 * 64,
          thinkingConfig: { includeThoughts: true, thinkingLevel: "high" },
        },
      },
    },
  },

  // OpenAI Compatible - Other providers
  kimi: {
    provider: "moonshotai",
    caller: callOpenAICompatibleModel,
    params: {
      model: "kimi-k2.5",
      thinking: { type: "enabled" },
    },
  },
  deepseek: {
    provider: "deepseek",
    caller: callOpenAICompatibleModel,
    params: {
      model: "deepseek-v3.2",
      thinking: { type: "enabled" },
    },
  },
  minimax: {
    provider: "minimax",
    caller: callOpenAICompatibleModel,
    params: {
      model: "MiniMax-M2.1",
      thinking: { type: "enabled" },
    },
  },
  glm: {
    provider: "zai",
    caller: callOpenAICompatibleModel,
    params: {
      model: "glm-5",
      thinking: { type: "enabled" },
    },
  },
  qwen: {
    provider: "qwen",
    caller: callOpenAICompatibleModel,
    params: {
      model: "qwen3-next-80b-a3b",
      thinking: { type: "enabled" },
    },
  },
  "grok-fast": {
    provider: "xai",
    caller: callOpenAICompatibleModel,
    params: {
      model: "grok-4-1-fast-reasoning",
    },
  },
  "grok-code": {
    provider: "xai",
    caller: callOpenAICompatibleModel,
    params: {
      model: "grok-code-fast-1",
    },
  },
};

/**
 * モデル名からモデル呼び出し関数を作成する
 * @param {string} modelName - モデル名
 * @param {ModelProvidersConfig=} providers - プロバイダー設定
 * @returns {CallModel}
 * @throws {Error} 無効なモデル名の場合
 */
export function createModelCaller(modelName, providers) {
  const entry = MODEL_REGISTRY[modelName];
  if (!entry) {
    throw new Error(`Invalid model: "${modelName}"`);
  }

  const providerConfig = providers?.[entry.provider] ?? {};

  // Geminiモデルの場合は特殊な処理が必要
  if (entry.geminiModel) {
    const modelCaller = entry.caller(providerConfig, {
      model: entry.geminiModel,
    });
    return (input) =>
      modelCaller(
        {
          model: entry.geminiModel,
          ...entry.params,
        },
        input,
      );
  }

  // 通常のモデル
  return (input) => entry.caller(providerConfig, entry.params, input);
}
