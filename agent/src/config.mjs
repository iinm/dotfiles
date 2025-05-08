/**
 * @import { ToolUsePattern } from "./tool";
 */

import path from "node:path";
import { execCommandTool } from "./tools/execCommand.mjs";
import { tmuxCommandTool } from "./tools/tmuxCommand.mjs";

export const AGENT_PROJECT_METADATA_DIR =
  process.env.AGENT_PROJECT_METADATA_DIR || ".agent";
export const AGENT_MODEL = process.env.AGENT_MODEL || "claude-haiku";

/**
 * @typedef {object} CreateAllowedToolUsePatternsInput
 * @property {string} sessionId
 */

/**
 * @param {CreateAllowedToolUsePatternsInput} input
 * @returns {ToolUsePattern[]}
 */
export function createDefaultAllowedToolUsePatterns({ sessionId }) {
  /** @type {ToolUsePattern[]} */
  return [
    // Exec command
    {
      toolName: execCommandTool.def.name,
      input: { command: /^(date|uname)$/ },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: /^(ls|wc|cat|head|tail|fd|rg|find|grep)$/,
        /**
         * @param {unknown=} args
         */
        args: (args) => {
          if (!Array.isArray(args)) {
            return false;
          }
          for (const arg of args) {
            if (!ensureSafeRelativePath(arg)) {
              return false;
            }
          }
          return true;
        },
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "sed",
        args: ["-n", /^.+p$/, ensureSafeRelativePath],
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: { command: "git", args: [/^(status|diff|log|show)$/] },
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

/**
 * @param {unknown} arg
 */
export function ensureSafeRelativePath(arg) {
  if (typeof arg !== "string") {
    return false;
  }
  // Deny absolute paths or parent directory traversal
  if (arg.startsWith("/") || arg.startsWith("..")) {
    return false;
  }
  const segments = arg.split("/");
  if (segments.includes("..")) {
    return false;
  }
  return true;
}

/**
 * @typedef {object} LocalConfig
 * @property {ToolUsePattern[]} [allowedToolUsePatterns]
 * @property {Record<string,MCPServerConfig>} [mcpServers]
 */

/**
 * @typedef {object} MCPServerConfig
 * @property {string} command - The command to run the server.
 * @property {string[]} args - The arguments to pass to the command.
 */

/**
 * Local project local configuration.
 * @returns {Promise<LocalConfig>}
 */
export async function loadLocalConfig() {
  const configPath = path.resolve(`${AGENT_PROJECT_METADATA_DIR}/config.mjs`);
  try {
    const { default: config } = await import(configPath);
    return config;
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      err.code === "ERR_MODULE_NOT_FOUND"
    ) {
      return {};
    }
    throw err;
  }
}
