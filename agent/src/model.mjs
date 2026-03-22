import { callAnthropicModel } from "./providers/anthropic.mjs";
import { createCacheEnabledGeminiModelCaller } from "./providers/gemini.mjs";
import { callOpenAIModel } from "./providers/openai.mjs";
import { callOpenAICompatibleModel } from "./providers/openaiCompatible.mjs";

/**
 * @param {import("./modelDefinition").ModelDefinition} modelDef
 * @returns {import("./model").CallModel}
 */
export function createModelCaller(modelDef) {
  const { platform, model } = modelDef;

  switch (model.format) {
    case "anthropic":
      return (input) => callAnthropicModel(platform, model.config, input);
    case "gemini": {
      const modelCaller = createCacheEnabledGeminiModelCaller(
        platform,
        model.config,
      );
      return (input) => modelCaller(model.config, input);
    }
    case "openai-responses":
      return (input) => callOpenAIModel(platform, model.config, input);
    case "openai-messages":
      return (input) =>
        callOpenAICompatibleModel(platform, model.config, input);
  }
}
