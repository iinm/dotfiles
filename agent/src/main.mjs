/**
 * @import { Tool } from "./tool";
 */

import { styleText } from "node:util";
import { createAgent } from "./agent.mjs";
import { parseCliArgs, printHelp } from "./cliArgs.mjs";
import { startInteractiveSession } from "./cliInteractive.mjs";
import { loadAppConfig } from "./config.mjs";
import { loadAgentRoles } from "./context/loadAgentRoles.mjs";
import {
  AGENT_NOTIFY_CMD_DEFAULT,
  AGENT_PROJECT_METADATA_DIR,
  USER_NAME,
} from "./env.mjs";
import { setupMCPServer } from "./mcp.mjs";
import { createModelCaller } from "./modelCaller.mjs";
import { createPrompt } from "./prompt.mjs";
import { createAskGoogleTool } from "./tools/askGoogle.mjs";
import { delegateToSubagentTool } from "./tools/delegateToSubagent.mjs";
import { createExecCommandTool } from "./tools/execCommand.mjs";
import { fetchWebPageTool } from "./tools/fetchWebPage.mjs";
import { fetchWebPageWithBrowserTool } from "./tools/fetchWebPageWithBrowser.mjs";
import { patchFileTool } from "./tools/patchFile.mjs";
import { reportAsSubagentTool } from "./tools/reportAsSubagent.mjs";
import { createTavilySearchTool } from "./tools/tavilySearch.mjs";
import { createTmuxCommandTool } from "./tools/tmuxCommand.mjs";
import { writeFileTool } from "./tools/writeFile.mjs";
import { createToolUseApprover } from "./toolUseApprover.mjs";

const cliArgs = parseCliArgs(process.argv);
if (cliArgs.showHelp) {
  printHelp();
}

(async () => {
  const startTime = new Date();
  const sessionId = [
    startTime.toISOString().slice(0, 10),
    `0${startTime.getHours()}`.slice(-2) +
      `0${startTime.getMinutes()}`.slice(-2),
  ].join("-");
  const tmuxSessionId = `agent-${sessionId}`;
  const { appConfig, loadedConfigPath } = await loadAppConfig();

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
    const mcpServerEntries = Object.entries(appConfig.mcpServers);

    console.log();
    for (const [serverName] of mcpServerEntries) {
      console.log(
        styleText("blue", `🔌 Connecting to MCP server: ${serverName}...`),
      );
    }

    const mcpResults = await Promise.all(
      mcpServerEntries.map(async ([serverName, serverConfig]) => {
        const result = await setupMCPServer(serverName, serverConfig);
        return { serverName, ...result };
      }),
    );

    for (const { serverName, tools, cleanup } of mcpResults) {
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

  const modelNameWithVariant = cliArgs.model || appConfig.model || "";
  const agentRoles = await loadAgentRoles();

  const prompt = createPrompt({
    username: USER_NAME,
    modelName: modelNameWithVariant,
    sessionId,
    tmuxSessionId,
    workingDir: process.cwd(),
    projectMetadataDir: AGENT_PROJECT_METADATA_DIR,
    agentRoles,
  });

  const builtinTools = [
    createExecCommandTool({ sandbox: appConfig.sandbox }),
    writeFileTool,
    patchFileTool,
    createTmuxCommandTool({ sandbox: appConfig.sandbox }),
    fetchWebPageTool,
    fetchWebPageWithBrowserTool,
    delegateToSubagentTool,
    reportAsSubagentTool,
  ];

  if (appConfig.tools?.tavily?.apiKey) {
    builtinTools.push(createTavilySearchTool(appConfig.tools.tavily));
  }

  if (appConfig.tools?.askGoogle) {
    builtinTools.push(
      createAskGoogleTool({
        platform: appConfig.tools.askGoogle.platform,
        baseURL: appConfig.tools.askGoogle.baseURL,
        apiKey: appConfig.tools.askGoogle.apiKey,
      }),
    );
  }

  const toolUseApprover = createToolUseApprover({
    maxApprovals: appConfig.autoApproval?.maxApprovals || 50,
    defaultAction: appConfig.autoApproval?.defaultAction || "ask",
    patterns: appConfig.autoApproval?.patterns || [],
    maskApprovalInput: (toolName, input) => {
      for (const tool of builtinTools) {
        if (tool.def.name === toolName && tool.maskApprovalInput) {
          return tool.maskApprovalInput(input);
        }
      }
      return input;
    },
  });

  const [modelName, modelVariant] = modelNameWithVariant.split("+");
  const modelDef = (appConfig.models ?? []).find(
    (entry) => entry.name === modelName && entry.variant === modelVariant,
  );
  if (!modelDef) {
    throw new Error(
      `Model "${modelNameWithVariant}" not found in configuration.`,
    );
  }

  const platform = (appConfig.platforms ?? []).find(
    (entry) =>
      entry.name === modelDef.platform.name &&
      entry.variant === modelDef.platform.variant,
  );
  if (!platform) {
    throw new Error(
      `Platform ${modelDef.platform.name} variant=${modelDef.platform.variant} not found in configuration.`,
    );
  }

  const { userEventEmitter, agentEventEmitter, agentCommands } = createAgent({
    callModel: createModelCaller({
      ...modelDef,
      platform: {
        ...modelDef.platform,
        ...platform,
      },
    }),
    prompt,
    tools: [...builtinTools, ...mcpTools],
    toolUseApprover,
    agentRoles,
  });

  startInteractiveSession({
    userEventEmitter,
    agentEventEmitter,
    agentCommands,
    sessionId,
    modelName: modelNameWithVariant,
    notifyCmd: appConfig.notifyCmd || AGENT_NOTIFY_CMD_DEFAULT,
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
