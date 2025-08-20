/**
 * @import { Tool } from "./tool";
 */

import { styleText } from "node:util";
import { createAgent } from "./agent.mjs";
import { startInteractiveSession } from "./cli.mjs";
import { loadAppConfig } from "./config.mjs";
import { AGENT_PROJECT_METADATA_DIR, USER_NAME } from "./env.mjs";
import { setupMCPServer } from "./mcp.mjs";
import { createModelCaller } from "./model.mjs";
import { createPrompt } from "./prompt.mjs";
import { createToolUseApprover } from "./tool.mjs";
import { createExecCommandTool } from "./tools/execCommand.mjs";
import { patchFileTool } from "./tools/patchFile.mjs";
import { readWebPageTool } from "./tools/readWebPage.mjs";
import { readWebPageWithBrowserTool } from "./tools/readWebPageWithBrowser.mjs";
import { createTavilySearchTool } from "./tools/tavilySearch.mjs";
import { createTmuxCommandTool } from "./tools/tmuxCommand.mjs";
import { writeFileTool } from "./tools/writeFile.mjs";
import { createSessionId } from "./utils/createSessionId.mjs";

(async () => {
  const sessionId = createSessionId();
  const tmuxSessionId = `agent-${sessionId}`;
  const { appConfig, loadedConfigPath } = await loadAppConfig({
    tmuxSessionId,
  });

  if (loadedConfigPath.length > 0) {
    console.log(styleText("green", "\n⚡ Loaded configuration files"));
    console.log(loadedConfigPath.map((p) => `  ⤷ ${p}`).join("\n"));
  }

  if (appConfig.sandbox) {
    const sandboxStr = [
      appConfig.sandbox.command,
      ...(appConfig.sandbox.args || []),
    ].join(" ");
    console.log(styleText("green", "\n📦 Sandbox: on"));
    console.log(`  ⤷ ${sandboxStr}`);
  } else {
    console.log(styleText("yellow", "\n📦 Sandbox: off"));
  }

  /** @type {(() => Promise<void>)[]} */
  const mcpCleanups = [];

  /** @type {Tool[]} */
  const mcpTools = [];
  if (appConfig.mcpServers) {
    for (const [serverName, serverConfig] of Object.entries(
      appConfig.mcpServers,
    )) {
      console.log(
        styleText("blue", `\n🔌 Connecting to MCP server: ${serverName}...`),
      );
      const { tools, cleanup } = await setupMCPServer(serverName, serverConfig);
      mcpTools.push(...tools);
      mcpCleanups.push(cleanup);
      console.log(
        styleText(
          "green",
          `✅ Successfully connected to MCP server: ${serverName}`,
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
    createExecCommandTool({ sandbox: appConfig.sandbox }),
    writeFileTool,
    patchFileTool,
    createTmuxCommandTool({ sandbox: appConfig.sandbox }),
    readWebPageTool,
    readWebPageWithBrowserTool,
  ];

  if (appConfig.tools?.tavily?.apiKey) {
    builtinTools.push(createTavilySearchTool(appConfig.tools.tavily));
  }

  const toolUseApprover = createToolUseApprover({
    max: appConfig.autoApproval?.max || 0,
    patterns: appConfig.autoApproval?.patterns || [],
    maskApprovedInput: (toolName, input) => {
      for (const tool of builtinTools) {
        if (tool.def.name === toolName && tool.maskApprovedInput) {
          return tool.maskApprovedInput(input);
        }
      }
      return input;
    },
  });

  const { userEventEmitter, agentEventEmitter, agentCommands } = createAgent({
    callModel: createModelCaller(appConfig.model || "", appConfig.providers),
    prompt,
    tools: [...builtinTools, ...mcpTools],
    toolUseApprover,
  });

  startInteractiveSession({
    userEventEmitter,
    agentEventEmitter,
    agentCommands,
    sessionId,
    modelName: appConfig.model || "",
    notifyCmd: appConfig.notifyCmd || "",
    sandbox: Boolean(appConfig.sandbox),
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
