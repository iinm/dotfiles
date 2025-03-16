import { createAgent } from "./agent.mjs";
import { startCLI } from "./cli.mjs";
import { createModelCaller } from "./model.mjs";
import { tavilySearchTool } from "./tools/tavilySearch.mjs";

const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

(async () => {
  const startTime = new Date();
  // e.g. 2025-12-31-2359
  const threadId = `${startTime.toISOString().slice(0, 10)}-${(`0${startTime.getHours()}`).slice(-2)}${(`0${startTime.getMinutes()}`).slice(-2)}`;

  const { userEventEmitter, agentEventEmitter } = createAgent({
    callModel: createModelCaller(AGENT_MODEL),
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
