/**
 * @import { Tool } from "./tool";
 */

import { styleText } from "node:util";
import { createAgent } from "./agent.mjs";
import { startCLI } from "./cli.mjs";
import {
  AGENT_MODEL,
  AGENT_PROJECT_METADATA_DIR,
  createAllowedToolUsePatterns,
  loadLocalConfig,
} from "./config.mjs";
import { createMCPClient, createMCPTools } from "./mcp.mjs";
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

  /** @type {(() => Promise<void>)[]} */
  const mcpCleanups = [];

  /** @type {Tool[]} */
  const mcpTools = [];
  if (localConfig.mcpServers) {
    for (const [name, params] of Object.entries(localConfig.mcpServers)) {
      process.stdout.write(
        styleText("blue", `Connecting to MCP server: ${name}`),
      );
      const mcpClient = await createMCPClient({
        name,
        params,
      });
      process.stdout.write(" ✅\n");
      mcpCleanups.push(() => mcpClient.close());
      const tools = await createMCPTools(mcpClient);
      mcpTools.push(...tools);
    }
  }

  const prompt = createPrompt({
    sessionId,
    workingDir: process.cwd(),
    projectMetadataDir: AGENT_PROJECT_METADATA_DIR,
  });

  const tools = [
    execCommandTool,
    writeFileTool,
    patchFileTool,
    tmuxCommandTool,
  ];

  if (process.env.TAVILY_API_KEY) {
    tools.push(tavilySearchTool);
  }

  const { userEventEmitter, agentEventEmitter } = createAgent({
    callModel: createModelCaller(AGENT_MODEL),
    prompt,
    tools: [...tools, ...mcpTools],
    toolUseApprover,
  });

  startCLI({
    userEventEmitter,
    agentEventEmitter,
    sessionId,
    modelName: AGENT_MODEL,
    onStop: async () => {
      for (const cleanup of mcpCleanups) {
        await cleanup();
      }
    },
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
