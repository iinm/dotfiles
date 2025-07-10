/**
 * @import { Tool } from "./tool";
 */

import { styleText } from "node:util";
import { createAgent } from "./agent.mjs";
import { startInteractiveSession } from "./cli.mjs";
import { loadAgentConfig } from "./config.mjs";
import { AGENT_PROJECT_METADATA_DIR, USER_NAME } from "./env.mjs";
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
  const tmuxSessionId = `agent-${sessionId}`;
  const agentConfig = await loadAgentConfig({ tmuxSessionId });

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
    username: USER_NAME,
    sessionId,
    tmuxSessionId,
    workingDir: process.cwd(),
    projectMetadataDir: AGENT_PROJECT_METADATA_DIR,
  });

  const builtinTools = [
    execCommandTool,
    writeFileTool,
    patchFileTool,
    tmuxCommandTool,
    readWebPageTool,
    readWebPageWithBrowserTool,
  ];

  if (agentConfig.tools?.tavily) {
    builtinTools.push(createTavilySearchTool(agentConfig.tools.tavily));
  }

  const toolUseApprover = createToolUseApprover({
    maxAutoApprovals: agentConfig.permissions?.maxAutoApprovals || 0,
    allowedToolUses: agentConfig.permissions?.allow || [],
    maskAllowedInput: (toolName, input) => {
      for (const tool of builtinTools) {
        if (tool.def.name === toolName && tool.maskAllowedInput) {
          return tool.maskAllowedInput(input);
        }
      }
      return input;
    },
  });

  const { userEventEmitter, agentEventEmitter, agentCommands } = createAgent({
    callModel: createModelCaller(
      agentConfig.model || "",
      agentConfig.providers,
    ),
    prompt,
    tools: [...builtinTools, ...mcpTools],
    toolUseApprover,
  });

  startInteractiveSession({
    userEventEmitter,
    agentEventEmitter,
    agentCommands,
    sessionId,
    modelName: agentConfig.model || "",
    notifyCmd: agentConfig.notifyCmd || "",
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
