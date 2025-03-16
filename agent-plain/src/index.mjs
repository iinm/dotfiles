/**
 * @import {CallModel} from "./chat"
 */

import { createAgent } from "./agent.mjs";
import { startCLI } from "./cli.mjs";
import { callAnthropicModel } from "./provider/anthropic.mjs";
import { callOpenAIModel } from "./provider/openai.mjs";

const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

(async () => {
  const callModel = createModelCaller(AGENT_MODEL);
  const { userEventEmitter, agentEventEmitter } = createAgent({
    callModel,
    tools: [],
  });

  startCLI(userEventEmitter, agentEventEmitter);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * @param {string} modelName
 * @returns {CallModel}
 */
function createModelCaller(modelName) {
  switch (modelName) {
    case "gpt-4o-mini":
      return (input) =>
        callOpenAIModel(
          {
            model: "gpt-4o-mini",
            temperature: 0,
          },
          input,
        );
    case "o3-mini-medium":
      return (input) =>
        callOpenAIModel(
          {
            model: "o3-mini",
            reasoningEffort: "medium",
          },
          input,
        );
    case "o3-mini-high":
      return (input) =>
        callOpenAIModel(
          {
            model: "o3-mini",
            reasoningEffort: "high",
          },
          input,
        );
    case "claude-3-5-haiku":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-3-5-haiku-latest",
            max_tokens: 1024,
            temperature: 0,
          },
          input,
        );
    case "claude-3-7-sonnet":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-3-7-sonnet-latest",
            max_tokens: 1024 * 8,
            temperature: 0,
          },
          input,
        );
    case "claude-3-7-sonnet-thinking":
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
    default:
      throw new Error(`Invalid model: ${modelName}`);
  }
}
