/**
 * @import { Tool } from "./tool";
 */

import { styleText } from "node:util";
import { createAgent } from "./agent.mjs";
import { startCLI } from "./cli.mjs";
import { loadAgentConfig } from "./config.mjs";
import { AGENT_PROJECT_METADATA_DIR } from "./env.mjs";
import { connectToMCPServer } from "./mcp.mjs";
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
import { createSessionId } from "./utils/createSessionId.mjs";

(async () => {
  const sessionId = createSessionId();
  const agentConfig = await loadAgentConfig({ sessionId });

  const toolUseApprover = createToolUseApprover({
    maxApproveCount: 20,
    allowedToolUses: agentConfig.allowedToolUsePatterns || [],
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
      const { tools, cleanup } = await connectToMCPServer(
        serverName,
        serverConfig,
      );
      mcpTools.push(...tools);
      mcpCleanups.push(cleanup);
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

  const modelName = /** @type {string} */ (agentConfig.model);
  const { userEventEmitter, agentEventEmitter, agentCommands } = createAgent({
    callModel: createModelCaller(modelName, agentConfig.providers),
    prompt,
    tools: [...tools, ...mcpTools],
    toolUseApprover,
  });

  startCLI({
    userEventEmitter,
    agentEventEmitter,
    agentCommands,
    sessionId,
    modelName,
    notifyCmd: /** @type {string} */ (agentConfig.notifyCmd),
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
