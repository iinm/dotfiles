/**
 * @import { ToolUsePattern } from "./tool";
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
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
        command: /^(ls|wc|cat|head|tail)$/,
        /**
         * @param {unknown=} args
         */
        args: (args) => {
          if (!Array.isArray(args)) {
            return false;
          }
          if (!args.every(ensureSafeRelativePath)) {
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
          if (!args.every(ensureSafeRelativePath)) {
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
          if (!args.every(ensureSafeRelativePath)) {
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
  if (
    arg.startsWith("/") ||
    arg.startsWith("..") ||
    arg.split("/").includes("..")
  ) {
    return false;
  }

  // Always allow access to agent project metadata directory
  if (
    arg === AGENT_PROJECT_METADATA_DIR ||
    arg.startsWith(`${AGENT_PROJECT_METADATA_DIR}/`)
  ) {
    return true;
  }

  // Deny git ignored files (which may contain sensitive information or should not be accessed)
  if (fs.existsSync(arg)) {
    try {
      execFileSync("git", ["check-ignore", "--no-index", "-q", arg], {
        stdio: ["ignore", "ignore", "ignore"],
      });
      // The path is ignored (exit code 0)
      return false;
    } catch (error) {
      if (
        error instanceof Error &&
        "status" in error &&
        typeof error.status === "number"
      ) {
        if (error.status === 1) {
          // Path is not ignored,
        } else {
          // Other git error (e.g., status 128 if not a git repo).
          return false;
        }
      } else {
        console.error(
          `Unexpected error checking git ignore for ${arg}:`,
          error,
        );
        return false;
      }
    }
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
 * @property {Record<string,string>=} env - The environment variables for the server.
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
