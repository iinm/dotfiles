/**
 * @import { Tool } from "./tool";
 */

import { styleText } from "node:util";
import { createAgent } from "./agent.mjs";
import { startCLI } from "./cli.mjs";
import {
  createDefaultAllowedToolUsePatterns,
  loadAgentConfig,
} from "./config.mjs";
import { AGENT_MODEL, AGENT_PROJECT_METADATA_DIR } from "./env.mjs";
import { createMCPClient, createMCPTools } from "./mcp.mjs";
import { createModelCaller } from "./model.mjs";
import { createPrompt } from "./prompt.mjs";
import { createToolUseApprover } from "./tool.mjs";
import { execCommandTool } from "./tools/execCommand.mjs";
import { patchFileTool } from "./tools/patchFile.mjs";
import { readWebPageTool } from "./tools/readWebPage.mjs";
import { readWebPageWithBrowserTool } from "./tools/readWebPageWithBrowser.mjs";
import { createTavilySearchTool } from "./tools/tavilySearch.mjs";
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

  const agentConfig = await loadAgentConfig();

  const toolUseApprover = createToolUseApprover({
    maxApproveCount: 20,
    allowedToolUses: [
      ...createDefaultAllowedToolUsePatterns({ sessionId }),
      ...(agentConfig.allowedToolUsePatterns || []),
    ],
    maskAllowedInput: (toolName, input) => {
      if (toolName === patchFileTool.def.name) {
        return {
          filePath: input.filePath,
          // ignore diff
        };
      }
      if (toolName === writeFileTool.def.name) {
        return {
          filePath: input.filePath,
          // ignore content
        };
      }
      return input;
    },
  });

  /** @type {(() => Promise<void>)[]} */
  const mcpCleanups = [];

  /** @type {Tool[]} */
  const mcpTools = [];
  if (agentConfig.mcpServers) {
    for (const [serverName, serverConfig] of Object.entries(
      agentConfig.mcpServers,
    )) {
      console.log(
        styleText("blue", `Connecting to MCP server: ${serverName}...`),
      );
      const { options, ...params } = serverConfig;
      const mcpClient = await createMCPClient({
        serverName,
        params,
      });
      mcpCleanups.push(() => mcpClient.close());
      const tools = (await createMCPTools(serverName, mcpClient)).filter(
        (tool) =>
          !options?.enabledTools ||
          options.enabledTools.find((enabledToolName) =>
            tool.def.name.endsWith(`__${enabledToolName}`),
          ),
      );
      mcpTools.push(...tools);
      console.log(
        styleText(
          "green",
          `Successfully connected to MCP server: ${serverName} ✅`,
        ),
      );
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
    readWebPageTool,
    readWebPageWithBrowserTool,
  ];

  if (agentConfig.tools?.tavily) {
    tools.push(createTavilySearchTool(agentConfig.tools.tavily));
  }

  const { userEventEmitter, agentEventEmitter, agentCommands } = createAgent({
    callModel: createModelCaller(AGENT_MODEL, agentConfig.providers),
    prompt,
    tools: [...tools, ...mcpTools],
    toolUseApprover,
  });

  startCLI({
    userEventEmitter,
    agentEventEmitter,
    agentCommands,
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
