/**
 * @import { ToolUsePattern } from "./tool";
 */

import { createAgent } from "./agent.mjs";
import { startCLI } from "./cli.mjs";
import { createModelCaller } from "./model.mjs";
import { createPrompt } from "./prompt.mjs";
import { createToolUseApprover } from "./tool.mjs";
import { execCommandTool } from "./tools/execCommand.mjs";
import { patchFileTool } from "./tools/patchFile.mjs";
import { tavilySearchTool } from "./tools/tavilySearch.mjs";
import { tmuxCommandTool } from "./tools/tmuxCommand.mjs";
import { writeFileTool } from "./tools/writeFile.mjs";

const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

(async () => {
  // e.g. 2025-12-31-2359
  const startTime = new Date();
  const sessionId = [
    startTime.toISOString().slice(0, 10),
    `0${startTime.getHours()}`.slice(-2),
    `0${startTime.getMinutes()}`.slice(-2),
  ].join("-");

  const toolUseApprover = createToolUseApprover({
    maxApproveCount: 20,
    allowedToolUses: createAllowedToolUsePatterns({ sessionId }),
  });

  const prompt = createPrompt({
    sessionId,
    workingDir: process.cwd(),
    agentDir: import.meta.dirname,
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

/**
 * @typedef {object} CreateAllowedToolUsePatternsInput
 * @property {string} sessionId
 */

/**
 * @param {CreateAllowedToolUsePatternsInput} input
 * @returns {ToolUsePattern[]}
 */
function createAllowedToolUsePatterns({ sessionId }) {
  /** @type {ToolUsePattern[]} */
  return [
    // Web search
    { toolName: tavilySearchTool.def.name, input: { query: /./ } },

    // Exec command
    {
      toolName: execCommandTool.def.name,
      input: { command: /^(ls|wc|cat|head|tail|fd|rg|find|grep|date)$/ },
    },
    {
      toolName: execCommandTool.def.name,
      input: { command: "sed", input: { args: ["-n", /^.+p$/] } },
    },
    {
      toolName: execCommandTool.def.name,
      input: { command: "git", input: { args: [/^(status|diff|log)$/] } },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "git",
        input: { args: ["branch", "--show-current"] },
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "mkdir",
        input: { args: ["-p", ".agent/memory"] },
      },
    },

    // Tmux command
    {
      toolName: tmuxCommandTool.def.name,
      input: {
        command: /^(list-sessions|list-windows|capture-pane)$/,
      },
    },
    {
      toolName: tmuxCommandTool.def.name,
      input: {
        command: /^(new-sessions|new)$/,
        args: ["-d", "-s", `agent-${sessionId}`],
      },
    },
  ];
}
