/**
 * @import { ToolUsePattern } from "./tool";
 */

import fs from "node:fs/promises";
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

export async function loadProjectPrompt() {
  const files = ["CLAUDE.md", "CLAUDE.local.md"];
  const contents = [];

  for (const file of files) {
    try {
      const fileContent = await fs.readFile(file, "utf8");
      contents.push(fileContent);
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === "ENOENT") {
        // ignore
      } else {
        throw err;
      }
    }
  }

  if (contents.length) {
    return contents.join("\n\n");
  }
}
