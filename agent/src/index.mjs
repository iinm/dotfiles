import { createAgent } from "./agent.mjs";
import { startCLI } from "./cli.mjs";
import {
  AGENT_MODEL,
  AGENT_PROJECT_METADATA_DIR,
  createAllowedToolUsePatterns,
  loadLocalConfig,
} from "./config.mjs";
import { createModelCaller } from "./model.mjs";
import { createPrompt } from "./prompt.mjs";
import { createToolUseApprover } from "./tool.mjs";
import { execCommandTool } from "./tools/execCommand.mjs";
import { patchFileTool } from "./tools/patchFile.mjs";
import { tavilySearchTool } from "./tools/tavilySearch.mjs";
import { tmuxCommandTool } from "./tools/tmuxCommand.mjs";
import { writeFileTool } from "./tools/writeFile.mjs";

(async () => {
  // Generate a session ID
  // e.g. 2025-12-31-2359
  const startTime = new Date();
  const sessionId = [
    startTime.toISOString().slice(0, 10),
    `0${startTime.getHours()}`.slice(-2) +
      `0${startTime.getMinutes()}`.slice(-2),
  ].join("-");

  const localConfig = await loadLocalConfig();
  const toolUseApprover = createToolUseApprover({
    maxApproveCount: 20,
    allowedToolUses: [
      ...createAllowedToolUsePatterns({ sessionId }),
      ...(localConfig.allowedToolUsePatterns || []),
    ],
  });

  const prompt = createPrompt({
    sessionId,
    workingDir: process.cwd(),
    projectMetadataDir: AGENT_PROJECT_METADATA_DIR,
  });

  const { userEventEmitter, agentEventEmitter } = createAgent({
    callModel: createModelCaller(AGENT_MODEL),
    prompt,
    tools: [
      execCommandTool,
      writeFileTool,
      patchFileTool,
      tmuxCommandTool,
      tavilySearchTool,
    ],
    toolUseApprover,
  });

  startCLI({
    userEventEmitter,
    agentEventEmitter,
    sessionId,
    modelName: AGENT_MODEL,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
