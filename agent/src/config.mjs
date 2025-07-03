/**
 * @import { ToolUsePattern } from "./tool";
 */

import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "./env.mjs";
import { execCommandTool } from "./tools/execCommand.mjs";
import { tmuxCommandTool } from "./tools/tmuxCommand.mjs";
import { isSafeRelativePath } from "./utils/isSafeRelativePath.mjs";

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
      input: { command: /^(pwd|cd|date|uname)$/ },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: /^(ls|wc|cat|head|tail)$/,
        /**
         * @param {unknown=} args
         */
        args: (args) => {
          if (!Array.isArray(args)) {
            return false;
          }
          if (!args.every(isSafeRelativePath)) {
            return false;
          }
          return true;
        },
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "fd",
        /**
         * @param {unknown=} args
         */
        args: (args) => {
          if (!Array.isArray(args)) {
            return false;
          }
          if (!args.every(isSafeRelativePath)) {
            return false;
          }
          if (
            args.some(
              (arg) =>
                ["-I", "-x"].includes(arg) ||
                arg.startsWith("--no-ignore") ||
                arg.startsWith("--exec"),
            )
          ) {
            return false;
          }
          return true;
        },
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "rg",
        /**
         * @param {unknown=} args
         */
        args: (args) => {
          if (!Array.isArray(args)) {
            return false;
          }
          if (!args.every(isSafeRelativePath)) {
            return false;
          }
          if (args.some((arg) => arg.startsWith("--no-ignore"))) {
            return false;
          }
          return true;
        },
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "sed",
        args: ["-n", /^.+p$/, isSafeRelativePath],
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
      input: { command: "docker", args: [/^(ps)$/] },
    },
    {
      toolName: execCommandTool.def.name,
      input: { command: "docker", args: ["compose", /^(ps|logs)$/] },
    },
    {
      toolName: execCommandTool.def.name,
      input: { command: "gh", args: ["pr", /^(view|diff)$/] },
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
 * @typedef {object} LocalConfig
 * @property {ToolUsePattern[]} [allowedToolUsePatterns]
 * @property {Record<string,MCPServerConfig>} [mcpServers]
 */

/**
 * @typedef {object} MCPServerConfig
 * @property {string} command - The command to run the server.
 * @property {string[]} args - The arguments to pass to the command.
 * @property {Record<string,string>=} env - The environment variables for the server.
 * @property {MCPServerAgentConfig=} agentConfig
 */

/**
 * @typedef {object} MCPServerAgentConfig
 * @property {string[]=} enabledTools - Enabled tool names. Only tools in this list will be loaded.
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
