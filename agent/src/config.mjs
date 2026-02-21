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
  AGENT_NOTIFY_CMD_DEFAULT,
  AGENT_PROJECT_METADATA_DIR,
  AGENT_ROOT,
  TRUSTED_CONFIG_HASHES_DIR,
} from "./env.mjs";
import { evalJSONConfig } from "./utils/evalJSONConfig.mjs";

/**
 * @typedef {Object} LoadAgentConfigInput
 * @property {string} tmuxSessionId
 */

/**
 * @param {LoadAgentConfigInput} input
 * @returns {Promise<{appConfig: AppConfig, loadedConfigPath: string[]}>}
 */
export async function loadAppConfig({ tmuxSessionId }) {
  const paths = [
    `${AGENT_ROOT}/.config/config.json`,
    `${AGENT_ROOT}/.config/config.local.json`,
    `${AGENT_PROJECT_METADATA_DIR}/config.json`,
    `${AGENT_PROJECT_METADATA_DIR}/config.local.json`,
  ];

  /** @type {string[]} */
  const loadedConfigPath = [];
  /** @type {AppConfig} */
  let merged = {
    model: AGENT_MODEL,
    autoApproval: {
      patterns: createDefaultAllowedToolUsePatterns({
        tmuxSessionId,
      }),
      maxApprovals: 50,
    },
    notifyCmd: AGENT_NOTIFY_CMD_DEFAULT,
    providers: {
      xai: {
        baseURL: "https://api.x.ai",
      },
    },
  };

  for (const filePath of paths) {
    const config = await loadConfigFile(path.resolve(filePath));
    if (Object.keys(config).length) {
      loadedConfigPath.push(filePath);
    }
    merged = {
      model: AGENT_MODEL || config.model || merged.model,
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
        moonshotai: {
          ...(merged.providers?.moonshotai ?? {}),
          ...(config.providers?.moonshotai ?? {}),
        },
        deepseek: {
          ...(merged.providers?.deepseek ?? {}),
          ...(config.providers?.deepseek ?? {}),
        },
        minimax: {
          ...(merged.providers?.minimax ?? {}),
          ...(config.providers?.minimax ?? {}),
        },
        qwen: {
          ...(merged.providers?.qwen ?? {}),
          ...(config.providers?.qwen ?? {}),
        },
        zai: {
          ...(merged.providers?.zai ?? {}),
          ...(config.providers?.zai ?? {}),
        },
        xai: {
          ...(merged.providers?.xai ?? {}),
          ...(config.providers?.xai ?? {}),
        },
      },
      autoApproval: {
        patterns: [
          ...(config.autoApproval?.patterns ?? []),
          ...(merged.autoApproval?.patterns ?? []),
        ],
        maxApprovals:
          config.autoApproval?.maxApprovals ??
          merged.autoApproval?.maxApprovals,
      },
      sandbox: config.sandbox ?? merged.sandbox,
      tools: {
        tavily: {
          ...(merged.tools?.tavily ?? {}),
          ...(config.tools?.tavily ?? {}),
        },
        askGoogle: {
          ...(merged.tools?.askGoogle ?? {}),
          ...(config.tools?.askGoogle ?? {}),
        },
      },
      mcpServers: {
        ...(merged.mcpServers ?? {}),
        ...(config.mcpServers ?? {}),
      },
      notifyCmd: config.notifyCmd || merged.notifyCmd,
    };
  }

  return { appConfig: merged, loadedConfigPath };
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
      console.log(styleText("blue", `\nFound a config file at ${filePath}`));
      rl.question(
        styleText("yellow", "Do you want to load this file? (y/N) "),
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
    const commentRemovedContent = content.replace(/^ *\/\/.+$/gm, "");
    const parsed = JSON.parse(commentRemovedContent);
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
export function createDefaultAllowedToolUsePatterns({ tmuxSessionId }) {
  /** @type {ToolUsePattern[]} */
  return [
    // Exec command
    {
      toolName: "exec_command",
      input: { command: /^(pwd|date|uname|ls|wc|cat|head|tail|jq|echo)$/ },
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
              !arg.match(
                /^(--unrestricted|-u|--no-ignore|-I|--exec|-x|--exec-batch|-X)(=.+)?$/,
              ),
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
            (arg) =>
              typeof arg === "string" &&
              !arg.match(/^(--unrestricted|-u|--no-ignore)(=.+)?$/),
          ),
      },
    },
    {
      toolName: "exec_command",
      input: {
        command: "sed",
        args: ["-n", /^\d+(,\d+)?(p|l)$/],
      },
    },
    {
      toolName: "exec_command",
      input: {
        command: "awk",
        // Supported patterns:
        // FNR==0, FNR=200 {print FNR, $0}
        // FNR==0, FNR=200 {print $0}
        // FNR==50 {print $0}
        // NR==0, NR=200 {print NR, $0}
        args: [/^F?NR==\d+(, *F?NR==-?\d+)? *\{print (F?NR[," ]*)?\$0\}$/],
      },
    },
    {
      toolName: "exec_command",
      input: {
        command: "awk",
        // Supported patterns:
        // FNR>=76 && FNR<=85 {print $0}
        args: [
          /^F?NR[=<>]+\d+ *(&& *F?NR[=<>]+-?\d+)? *\{print (F?NR[," ]*)?\$0\}$/,
        ],
      },
    },
    {
      toolName: "exec_command",
      input: {
        command: "git",
        args: [/^(status|diff|log|show|ls-remote|rev-parse)$/],
      },
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
      input: { command: "gh", args: ["--version"] },
    },
    {
      toolName: "exec_command",
      input: { command: "gh", args: ["auth", "status"] },
    },
    {
      toolName: "exec_command",
      input: { command: "gh", args: [/^(pr|issue)$/, /^(view|diff)$/] },
    },
    {
      toolName: "exec_command",
      input: {
        command: "gh",
        args: ["api", /^repos\/[^/]+\/[^/]+\/pulls\/\d+\/comments$/],
      },
    },
    {
      toolName: "exec_command",
      input: {
        command: "gh",
        args: ["api", /^repos\/[^/]+\/[^/]+\/pulls\/comments\/\d+$/],
      },
    },

    // Tmux command
    {
      toolName: "tmux_command",
      input: {
        command: /^(list-sessions|list-windows)$/,
      },
    },
    {
      toolName: "tmux_command",
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
      toolName: "tmux_command",
      input: {
        command: /^(new-session|new)$/,
        args: ["-d", "-s", tmuxSessionId],
      },
    },
  ];
}
