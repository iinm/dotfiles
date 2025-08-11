/**
 * @import { ToolUsePattern } from "./tool";
 * @import { AppConfig } from "./config";
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { styleText } from "node:util";
import {
  AGENT_MODEL,
  AGENT_MODEL_DEFAULT,
  AGENT_NOTIFY_CMD_DEFAULT,
  AGENT_PROJECT_METADATA_DIR,
  AGENT_ROOT,
  TRUSTED_CONFIG_HASHES_DIR,
} from "./env.mjs";
import { tmuxCommandTool } from "./tools/tmuxCommand.mjs";
import { evalJSONConfig } from "./utils/evalJSONConfig.mjs";

/**
 * @typedef {Object} LoadAgentConfigInput
 * @property {string} tmuxSessionId
 */

/**
 * @param {LoadAgentConfigInput} input
 * @returns {Promise<AppConfig>}
 */
export async function loadAgentConfig({ tmuxSessionId }) {
  const paths = [
    `${AGENT_ROOT}/.config/config.json`,
    `${AGENT_ROOT}/.config/config.local.json`,
    `${AGENT_PROJECT_METADATA_DIR}/config.json`,
    `${AGENT_PROJECT_METADATA_DIR}/config.local.json`,
  ];

  /** @type {string[]} */
  const loaded = [];
  /** @type {AppConfig} */
  let merged = {
    model: AGENT_MODEL || AGENT_MODEL_DEFAULT,
    permissions: {
      allow: createDefaultAllowedToolUsePatterns({
        tmuxSessionId,
      }),
      maxAutoApprovals: 30,
    },
    notifyCmd: AGENT_NOTIFY_CMD_DEFAULT,
  };

  for (const filePath of paths) {
    const config = await loadConfigFile(path.resolve(filePath));
    if (Object.keys(config).length) {
      loaded.push(filePath);
    }
    merged = {
      model: config.model || merged.model,
      providers: {
        gemini: {
          ...(merged.providers?.gemini ?? {}),
          ...(config.providers?.gemini ?? {}),
        },
        openai: {
          ...(merged.providers?.openai ?? {}),
          ...(config.providers?.openai ?? {}),
        },
        anthropic: {
          ...(merged.providers?.anthropic ?? {}),
          ...(config.providers?.anthropic ?? {}),
        },
      },
      permissions: {
        allow: [
          ...(merged.permissions?.allow ?? []),
          ...(config.permissions?.allow ?? []),
        ],
        maxAutoApprovals:
          config.permissions?.maxAutoApprovals ??
          merged.permissions?.maxAutoApprovals,
      },
      sandbox: config.sandbox ?? merged.sandbox,
      tools: {
        tavily: {
          ...(merged.tools?.tavily ?? {}),
          ...(config.tools?.tavily ?? {}),
        },
      },
      mcpServers: {
        ...(merged.mcpServers ?? {}),
        ...(config.mcpServers ?? {}),
      },
      notifyCmd: config.notifyCmd || merged.notifyCmd,
    };
  }

  console.log(styleText("green", "\n⚙ Loaded configuration files:"));
  console.log(loaded.map((p) => `• ${p}`).join("\n"));

  return merged;
}

/**
 * @param {string} filePath
 * @returns {Promise<AppConfig>}
 */
export async function loadConfigFile(filePath) {
  let content;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return {};
    }
    throw err;
  }

  const hash = crypto.createHash("sha256").update(content).digest("hex");
  const isTrusted = await isConfigHashTrusted(hash);

  if (!isTrusted) {
    if (!process.stdout.isTTY) {
      console.warn(
        styleText(
          "yellow",
          `WARNING: Config file found at '${filePath}' but cannot ask for approval without a TTY. Skipping.`,
        ),
      );
      return {};
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      console.log(styleText("blue", `\nFound a config file at ${filePath}:`));
      console.log(styleText("gray", "<config>"));
      console.log(content);
      console.log(styleText("gray", "</config>"));
      rl.question(
        styleText("yellow", "\nDo you want to load this file? (y/N) "),
        (ans) => {
          rl.close();
          resolve(ans);
        },
      );
    });

    if (answer.toLowerCase() !== "y") {
      console.log(styleText("yellow", "Skipping local config file."));
      return {};
    }

    await trustConfigHash(hash);
  }

  try {
    const parsed = JSON.parse(content);
    return /** @type {AppConfig} */ (evalJSONConfig(parsed));
  } catch (err) {
    throw new Error(`Failed to parse JSON config at ${filePath}`, {
      cause: err,
    });
  }
}

/**
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function isConfigHashTrusted(hash) {
  try {
    await fs.access(path.join(TRUSTED_CONFIG_HASHES_DIR, hash));
    return true;
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

/**
 * @param {string} hash
 */
async function trustConfigHash(hash) {
  await fs.mkdir(TRUSTED_CONFIG_HASHES_DIR, { recursive: true });
  await fs.writeFile(path.join(TRUSTED_CONFIG_HASHES_DIR, hash), "");
}

/**
 * @typedef {object} CreateAllowedToolUsePatternsInput
 * @property {string} tmuxSessionId
 */

/**
 * @param {CreateAllowedToolUsePatternsInput} input
 * @returns {ToolUsePattern[]}
 */
function createDefaultAllowedToolUsePatterns({ tmuxSessionId }) {
  /** @type {ToolUsePattern[]} */
  return [
    // Exec command
    {
      toolName: "exec_command",
      input: { command: /^(pwd|date|uname|ls|wc|cat|head|tail)$/ },
    },
    {
      toolName: "exec_command",
      input: {
        command: "fd",
        /**
         * @param {unknown=} args
         */
        args: (args) =>
          Array.isArray(args) &&
          args.every(
            (arg) =>
              typeof arg === "string" &&
              !["-I", "-x"].includes(arg) &&
              !arg.startsWith("--no-ignore") &&
              !arg.startsWith("--exec"),
          ),
      },
    },
    {
      toolName: "exec_command",
      input: {
        command: "rg",
        /**
         * @param {unknown=} args
         */
        args: (args) =>
          Array.isArray(args) &&
          args.every(
            (arg) => typeof arg === "string" && !arg.startsWith("--no-ignore"),
          ),
      },
    },
    {
      toolName: "exec_command",
      input: {
        command: "sed",
        args: ["-n", /^\d+(,\d+)?p$/],
      },
    },
    {
      toolName: "exec_command",
      input: {
        command: "awk",
        args: [/^FNR==\d+, *FNR==\d+ *\{print FNR, *\$0\}$/],
      },
    },
    {
      toolName: "exec_command",
      input: { command: "git", args: [/^(status|diff|log|show)$/] },
    },
    {
      toolName: "exec_command",
      input: { command: "git", args: ["branch", "--show-current"] },
    },
    {
      toolName: "exec_command",
      input: { command: "docker", args: [/^(ps)$/] },
    },
    {
      toolName: "exec_command",
      input: { command: "docker", args: ["compose", /^(ps|logs)$/] },
    },
    {
      toolName: "exec_command",
      input: { command: "gh", args: ["pr", /^(view|diff)$/] },
    },

    // Tmux command
    {
      toolName: tmuxCommandTool.def.name,
      input: {
        command: /^(list-sessions|list-windows)$/,
      },
    },
    {
      toolName: tmuxCommandTool.def.name,
      input: {
        command: "capture-pane",
        args: [
          "-p",
          "-t",
          /**
           * @param {unknown} arg
           */
          (arg) => typeof arg === "string" && arg.startsWith(tmuxSessionId),
        ],
      },
    },
    {
      toolName: tmuxCommandTool.def.name,
      input: {
        command: /^(new-session|new)$/,
        args: ["-d", "-s", tmuxSessionId],
      },
    },
  ];
}
