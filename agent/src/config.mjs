/**
 * @import { ToolUsePattern } from "./tool";
 * @import { AgentConfig } from "./config";
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { styleText } from "node:util";
import {
  AGENT_PROJECT_METADATA_DIR,
  AGENT_ROOT,
  TRUSTED_CONFIG_HASHES_DIR,
} from "./env.mjs";
import { execCommandTool } from "./tools/execCommand.mjs";
import { tmuxCommandTool } from "./tools/tmuxCommand.mjs";
import { isSafeToolArg } from "./utils/isSafeToolArg.mjs";

/**
 * @returns {Promise<AgentConfig>}
 */
export async function loadAgentConfig() {
  const paths = [
    `${AGENT_ROOT}/.config/config.mjs`,
    `${AGENT_ROOT}/.config/config.local.mjs`,
    `${AGENT_PROJECT_METADATA_DIR}/config.mjs`,
    `${AGENT_PROJECT_METADATA_DIR}/config.local.mjs`,
  ];

  /** @type {string[]} */
  const loaded = [];
  /** @type {AgentConfig} */
  let merged = {};

  for (const filePath of paths) {
    const config = await loadConfigFile(path.resolve(filePath));
    if (Object.keys(config).length) {
      loaded.push(filePath);
    }
    merged = {
      model: config.model || merged.model,
      allowedToolUsePatterns: [
        ...(merged.allowedToolUsePatterns ?? []),
        ...(config.allowedToolUsePatterns ?? []),
      ],
      mcpServers: {
        ...(merged.mcpServers ?? {}),
        ...(config.mcpServers ?? {}),
      },
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
      tools: {
        tavily: {
          ...(merged.tools?.tavily ?? {}),
          ...(config.tools?.tavily ?? {}),
        },
      },
      notifyCmd: config.notifyCmd || merged.notifyCmd,
    };
  }

  console.log(styleText("green", "\nConfiguration files loaded:"));
  console.log(loaded.map((p) => `- ${p}`).join("\n"));

  return merged;
}

/**
 * @param {string} filePath
 * @returns {Promise<AgentConfig>}
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
      if (filePath.endsWith(".local.mjs")) {
        console.log(
          styleText(
            "yellow",
            "Content of local config is not displayed for security reasons.",
          ),
        );
      } else {
        console.log(content);
      }
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

  const { default: config } = await import(filePath);
  return config;
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
      input: { command: /^(pwd|cd|ls|date|uname)$/ },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: /^(ls|wc|cat|head|tail)$/,
        /**
         * @param {unknown=} args
         */
        args: (args) => Array.isArray(args) && args.every(isSafeToolArg),
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "fd",
        /**
         * @param {unknown=} args
         */
        args: (args) =>
          Array.isArray(args) &&
          args.every(
            (arg) =>
              isSafeToolArg(arg) &&
              !["-I", "-x"].includes(arg) &&
              !arg.startsWith("--no-ignore") &&
              !arg.startsWith("--exec"),
          ),
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "rg",
        /**
         * @param {unknown=} args
         */
        args: (args) =>
          Array.isArray(args) &&
          args.every(
            (arg) => isSafeToolArg(arg) && !arg.startsWith("--no-ignore"),
          ),
      },
    },
    {
      toolName: execCommandTool.def.name,
      input: {
        command: "sed",
        args: ["-n", /^\d+(,\d+)?p$/, isSafeToolArg],
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
