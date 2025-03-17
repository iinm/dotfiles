/**
 * @import { ToolUsePattern } from "./tool";
 */

import { execCommandTool } from "./tools/execCommand.mjs";
import { tavilySearchTool } from "./tools/tavilySearch.mjs";
import { tmuxCommandTool } from "./tools/tmuxCommand.mjs";

export const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

/**
 * @typedef {object} CreateAllowedToolUsePatternsInput
 * @property {string} sessionId
 */

/**
 * @param {CreateAllowedToolUsePatternsInput} input
 * @returns {ToolUsePattern[]}
 */
export function createAllowedToolUsePatterns({ sessionId }) {
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
      input: { command: "sed", args: ["-n", /^.+p$/] },
    },
    {
      toolName: execCommandTool.def.name,
      input: { command: "git", args: [/^(status|diff|log)$/] },
    },
    {
      toolName: execCommandTool.def.name,
      input: { command: "git", args: ["branch", "--show-current"] },
    },
    {
      toolName: execCommandTool.def.name,
      input: { command: "mkdir", args: ["-p", ".agent/memory"] },
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
        command: /^(new-session|new)$/,
        args: ["-d", "-s", `agent-${sessionId}`],
      },
    },
  ];
}
