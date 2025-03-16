/**
 * @import { CallModel } from "./model"
 */

import { createAgent } from "./agent.mjs";
import { startCLI } from "./cli.mjs";
import { callAnthropicModel } from "./providers/anthropic.mjs";
import { callOpenAIModel } from "./providers/openai.mjs";
import { tavilySearchTool } from "./tools/tavilySearch.mjs";

const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

(async () => {
  const startTime = new Date();
  // e.g. 2025-12-31-2359
  const threadId =
    startTime.toISOString().slice(0, 10) +
    "-" +
    ("0" + startTime.getHours()).slice(-2) +
    ("0" + startTime.getMinutes()).slice(-2);

  const callModel = createModelCaller(AGENT_MODEL);
  const { userEventEmitter, agentEventEmitter } = createAgent({
    callModel,
    tools: [tavilySearchTool],
  });

  startCLI({
    userEventEmitter,
    agentEventEmitter,
    threadId,
    modelName: AGENT_MODEL,
  });
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
    case "claude-haiku":
      return (input) =>
        callAnthropicModel(
          {
            model: "claude-3-5-haiku-latest",
            max_tokens: 1024,
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
    default:
      throw new Error(`Invalid model: ${modelName}`);
  }
}
