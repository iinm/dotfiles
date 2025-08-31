/**
 * @import { Message, MessageContentToolResult, MessageContentToolUse, ProviderTokenUsage } from "./model"
 * @import { UserEventEmitter, AgentEventEmitter, AgentCommands } from "./agent"
 * @import { ExecCommandInput } from "./tools/execCommand"
 * @import { PatchFileInput } from "./tools/patchFile"
 * @import { WriteFileInput } from "./tools/writeFile"
 * @import { TmuxCommandInput } from "./tools/tmuxCommand"
 * @import { TavilySearchInput } from "./tools/tavilySearch"
 */

import fs from "node:fs";
import readline from "node:readline";
import { styleText } from "node:util";
import { createPatch } from "diff";
import { notify } from "./utils/notify.mjs";

const PROMPT_COMMANDS = [
  {
    command: "/memory.save",
    prompt: () => "Save task memory",
  },
  {
    command: "/memory.resume",
    prompt: () =>
      `
Load task memory and resume work.
- Display available task memory files with numbers and prompt the user to select one by number.
  - Wait for user selection before reading memory contents.
- Read the content of the selected memory file after the user selects it.
    `.trim(),
  },
  {
    command: "/commit",
    /**
     * @param {{modelName: string}} args
     * @returns {string}
     */
    prompt: ({ modelName }) =>
      `
Create a commit.
- Understand the staged changes: exec_command { command: "git", args: ["diff", "--staged"] }
- Check the commit message format: exec_command { command: "git", args: ["log", "--no-merges", "--oneline", "-n", "10"] }
- Create a concise and descriptive commit message that follows the project's commit convention.
- Use this exact format to include Co-authored-by information:
  exec_command: { command: "git", args: ["commit", "-m", "<commit message>", "-m", "", "-m", "Co-authored-by: Agent by iinm <agent-by-iinm+${modelName}@localhost>"] }
    `.trim(),
  },
  {
    command: "/commit.by-user",
    prompt: () =>
      `
Create a commit.
- Understand the staged changes: exec_command { command: "git", args: ["diff", "--staged"] }
- Check the commit message format: exec_command { command: "git", args: ["log", "--no-merges", "--oneline", "-n", "10"] }
- Create a concise and descriptive commit message that follows the project's commit convention.
- Create a commit: exec_command { command: "git", args: ["commit", "-m", "<commit message>"] }
    `.trim(),
  },
  {
    command: "/remind.project-knowledge-discovery",
    prompt: () => "Run project knowledge discovery process.",
  },
];

// Define available slash commands for tab completion
const SLASH_COMMANDS = [
  "/help",
  ...PROMPT_COMMANDS.map(({ command }) => command),
  "/clear",
  "/resume",
  "/messages.dump",
  "/messages.load",
];

const HELP_MESSAGE = `
Commands:
  /help                               - Display this help message
  /memory.save                        - Save the current task state to memory
  /memory.resume                      - Load a previously saved task memory
  /commit                             - Create a commit message based on staged changes
  /commit.by-user                     - Create a commit without Co-authored-by
  /remind.project-knowledge-discovery - Start project knowledge discovery process
  /clear                              - Clear conversation
  /resume                             - Resume conversation after an LLM provider error
  /messages.dump                      - Save current messages to a JSON file
  /messages.load                      - Load messages from a JSON file

File Input Syntax:
  @path/to/file     - Read content from a file
  @path/to/file:N   - Read line N from a file
  @path/to/file:N-M - Read lines N to M from a file
`.trim();

/**
 * @typedef {object} CliOptions
 * @property {UserEventEmitter} userEventEmitter
 * @property {AgentEventEmitter} agentEventEmitter
 * @property {AgentCommands} agentCommands
 * @property {string} sessionId
 * @property {string} modelName
 * @property {string} notifyCmd
 * @property {boolean} sandbox
 * @property {() => Promise<void>} onStop
 */

/**
 * @param {CliOptions} options
 */
export function startInteractiveSession({
  userEventEmitter,
  agentEventEmitter,
  agentCommands,
  sessionId,
  modelName,
  notifyCmd,
  sandbox,
  onStop,
}) {
  const state = {
    turn: true,
  };

  const cliPrompt = [
    "",
    styleText(["cyanBright", "bgGray"], "▌") +
      styleText(
        ["white", "bgGray"],
        `Session: ${sessionId}, Model: ${modelName}, Sandbox: ${sandbox ? "on" : "off"} `,
      ),
    "> ",
  ].join("\n");
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: cliPrompt,
    /**
     * @param {string} line
     */
    completer: (line) => {
      if (line.startsWith("/")) {
        const completions = SLASH_COMMANDS;
        const hits = completions.filter((c) => c.startsWith(line));
        const candidates = hits.length ? hits : completions;
        return [candidates, line];
      }
      return [[], line];
    },
  });

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    // readline should handle raw mode itself
    process.stdin.setRawMode(true);
  }

  process.stdin.on("keypress", async (_, key) => {
    if (key.ctrl && key.name === "c") {
      await onStop();
    }

    if (key.ctrl && key.name === "d") {
      await onStop();
    }
  });

  cli.on("line", async (input) => {
    const inputTrimmed = input.trim();

    if (!state.turn) {
      console.warn(
        styleText(
          "yellow",
          `\nAgent is working. Ignore input: ${inputTrimmed}`,
        ),
      );
      return;
    }

    if (inputTrimmed.length === 0) {
      cli.prompt();
      return;
    }

    // reset prompt
    cli.setPrompt(cliPrompt);

    if (["/help", "help"].includes(inputTrimmed.toLowerCase())) {
      console.log(`\n${HELP_MESSAGE}`);
      cli.prompt();
      return;
    }

    // Handle file reading when message starts with @
    if (inputTrimmed.startsWith("@")) {
      const fileMention = parseFileMention(inputTrimmed);
      if (fileMention instanceof Error) {
        console.log(styleText("red", `\n${fileMention.message}`));
        cli.prompt();
        return;
      }
      const fileContentOrError = readFileContent(
        fileMention.filePath,
        fileMention.startLine,
        fileMention.endLine,
      );

      if (fileContentOrError instanceof Error) {
        console.log(styleText("red", `\n${fileContentOrError.message}`));
        cli.prompt();
        return;
      }

      console.log(styleText("gray", "\n<input>"));
      console.log(fileContentOrError);
      console.log(styleText("gray", "</input>"));

      userEventEmitter.emit("userInput", fileContentOrError);
      state.turn = false;
      return;
    }

    if (inputTrimmed.toLowerCase() === "/clear") {
      agentCommands.clearMessages();
      cli.prompt();
      return;
    }

    if (inputTrimmed.toLowerCase() === "/messages.dump") {
      await agentCommands.dumpMessages();
      cli.prompt();
      return;
    }

    if (inputTrimmed.toLowerCase() === "/messages.load") {
      await agentCommands.loadMessages();
      cli.prompt();
      return;
    }

    for (const cmd of PROMPT_COMMANDS) {
      if (inputTrimmed.toLowerCase() === cmd.command) {
        const rawMessage = cmd.prompt({ modelName });
        const message = `System: ${rawMessage}`;
        console.log(styleText("gray", "\n<prompt>"));
        console.log(message);
        console.log(styleText("gray", "</prompt>"));

        userEventEmitter.emit("userInput", message);
        state.turn = false;
        return;
      }
    }

    userEventEmitter.emit("userInput", inputTrimmed);
    state.turn = false;
  });

  agentEventEmitter.on("partialMessageContent", (partialContent) => {
    if (partialContent.position === "start") {
      console.log(styleText("gray", `\n<${partialContent.type}>`));
    }
    if (partialContent.content) {
      if (partialContent.type === "tool_use") {
        process.stdout.write(styleText("gray", partialContent.content));
      } else {
        process.stdout.write(partialContent.content);
      }
    }
    if (partialContent.position === "stop") {
      console.log(styleText("gray", `\n</${partialContent.type}>`));
    }
  });

  agentEventEmitter.on("message", (message) => {
    printMessage(message);
  });

  agentEventEmitter.on("toolUseRequest", () => {
    cli.setPrompt(
      [
        styleText(
          "yellow",
          "\nApprove tool calls? (y = allow once, Y = allow in this session, or feedback)",
        ),
        cliPrompt,
      ].join("\n"),
    );
  });

  agentEventEmitter.on("providerTokenUsage", (usage) => {
    console.log(formatProviderTokenUsage(usage));
  });

  agentEventEmitter.on("error", (error) => {
    console.log(
      styleText(
        "red",
        `\nError: message=${error.message}, stack=${error.stack}`,
      ),
    );
  });

  agentEventEmitter.on("turnEnd", async () => {
    const err = notify(notifyCmd);
    if (err) {
      console.error(
        styleText("yellow", `\nNotification error: ${err.message}`),
      );
    }
    state.turn = true;
    cli.prompt();
  });

  cli.prompt();
}

/**
 * @param {Message} message
 */
function printMessage(message) {
  switch (message.role) {
    case "assistant": {
      // console.log(styleText("bold", "\nAgent:"));
      for (const part of message.content) {
        switch (part.type) {
          // Note: Streamで表示するためここでは表示しない
          // case "thinking":
          //   console.log(
          //     [
          //       styleText("blue", "<thinking>"),
          //       part.thinking,
          //       styleText("blue", "</thinking>\n"),
          //     ].join("\n"),
          //   );
          //   break;
          // case "text":
          //   console.log(part.text);
          //   break;
          case "tool_use":
            console.log(styleText("bold", "\nTool call:"));
            console.log(formatToolUse(part));
            break;
        }
      }
      break;
    }
    case "user": {
      for (const part of message.content) {
        switch (part.type) {
          case "tool_result": {
            console.log(styleText("bold", "\nTool result:"));
            console.log(formatToolResult(part));
            break;
          }
          case "text": {
            console.log(styleText("bold", "\nUser:"));
            console.log(part.text);
            break;
          }
          default: {
            console.log(styleText("bold", "\nUnknown Message Format:"));
            console.log(JSON.stringify(part, null, 2));
          }
        }
      }
      break;
    }
    default: {
      console.log(styleText("bold", "\nUnknown Message Format:"));
      console.log(JSON.stringify(message, null, 2));
    }
  }
}

/**
 * @param {MessageContentToolUse} toolUse
 */
function formatToolUse(toolUse) {
  const { toolName, input } = toolUse;

  if (toolName === "exec_command") {
    /** @type {Partial<ExecCommandInput>} */
    const execCommandInput = input;
    return [
      `tool: ${toolName}`,
      `commnad: ${execCommandInput.command}`,
      `args: ${JSON.stringify(execCommandInput.args)}`,
    ].join("\n");
  }

  if (toolName === "write_file") {
    /** @type {Partial<WriteFileInput>} */
    const writeFileInput = input;
    return [
      `tool: ${toolName}`,
      `filePath: ${writeFileInput.filePath}`,
      `content:\n${writeFileInput.content}`,
    ].join("\n");
  }

  if (toolName === "patch_file") {
    /** @type {Partial<PatchFileInput>} */
    const patchFileInput = input;
    const diff = patchFileInput.diff || "";

    /** @type {{search:string; replace:string}[]} */
    const diffs = [];
    const matches = Array.from(
      diff.matchAll(
        /<<<<<<< SEARCH\n(.*?)\n?=======\n(.*?)\n?>>>>>>> REPLACE/gs,
      ),
    );
    for (const match of matches) {
      const [_, search, replace] = match;
      diffs.push({ search, replace });
    }

    const highlightedDiff = diffs
      .map(
        ({ search, replace }) =>
          `${createPatch(patchFileInput.filePath || "", search, replace)
            .replace(/^-.+$/gm, (match) => styleText("red", match))
            .replace(/^\+.+$/gm, (match) => styleText("green", match))
            .replace(/^@@.+$/gm, (match) => styleText("gray", match))
            .replace(/^\\ No newline at end of file$/gm, (match) =>
              styleText("gray", match),
            )}\n-------\n${replace}`,
      )
      .join("\n\n");

    return [
      `tool: ${toolName}`,
      `path: ${patchFileInput.filePath}`,
      `diff:\n${highlightedDiff}`,
    ].join("\n");
  }

  if (toolName === "tmux_command") {
    /** @type {Partial<TmuxCommandInput>} */
    const tmuxCommandInput = input;
    return [
      `tool: ${toolName}`,
      `commnad: ${tmuxCommandInput.command}`,
      `args: ${JSON.stringify(tmuxCommandInput.args)}`,
    ].join("\n");
  }

  if (toolName === "search_web") {
    /** @type {Partial<TavilySearchInput>} */
    const tavilySearchInput = input;
    return [`tool: ${toolName}`, `query: ${tavilySearchInput.query}`].join(
      "\n",
    );
  }

  return JSON.stringify(toolUse, null, 2);
}

/**
 * @param {MessageContentToolResult} toolResult
 */
function formatToolResult(toolResult) {
  const { content, isError } = toolResult;

  /** @type {string[]} */
  const contentStringParts = [];
  for (const part of content) {
    switch (part.type) {
      case "text":
        contentStringParts.push(part.text);
        break;
      case "image":
        contentStringParts.push(
          `data:${part.mimeType};base64,${part.data.slice(0, 20)}...`,
        );
        break;
      default:
        console.log(`Unsupported content part: ${JSON.stringify(part)}`);
        break;
    }
  }

  const contentString = contentStringParts.join("\n\n");

  if (isError) {
    return styleText("red", contentString);
  }

  if (toolResult.toolName === "exec_command") {
    return contentString
      .replace(/(^<stdout>|<\/stdout>$)/gm, styleText("blue", "$1"))
      .replace(
        /(<truncated_output.+?>|<\/truncated_output>)/g,
        styleText("yellow", "$1"),
      )
      .replace(/(^<stderr>|<\/stderr>$)/gm, styleText("magenta", "$1"))
      .replace(/(^<error>|<\/error>$)/gm, styleText("red", "$1"));
  }

  if (toolResult.toolName === "tmux_command") {
    return contentString
      .replace(/(^<stdout>|<\/stdout>$)/gm, styleText("blue", "$1"))
      .replace(/(^<stderr>|<\/stderr>$)/gm, styleText("magenta", "$1"))
      .replace(/(^<error>|<\/error>$)/gm, styleText("red", "$1"))
      .replace(/(^<tmux.*?>|<\/tmux:.*?>$)/gm, styleText("green", "$1"));
  }

  const maxLength = 1024;
  if (contentString.length > maxLength) {
    return `${contentString.slice(0, maxLength)}... (Content omitted)`;
  }

  return contentString;
}

/**
 * @param {ProviderTokenUsage} usage
 */
function formatProviderTokenUsage(usage) {
  /** @type {string[]} */
  const lines = [];
  /** @type {string[]} */
  const header = [];
  for (const [key, value] of Object.entries(usage)) {
    if (typeof value === "number") {
      header.push(`${key}: ${value}`);
    } else if (typeof value === "string") {
      header.push(`${key}: ${value}`);
    } else if (value) {
      lines.push(
        `(${key}) ${Object.entries(value)
          .filter(
            ([k]) =>
              ![
                // OpenAI
                "audio_tokens",
                "accepted_prediction_tokens",
                "rejected_prediction_tokens",
              ].includes(k),
          )
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}`,
      );
    }
  }

  const outputLines = [`\n${header.join(", ")}`];

  if (lines.length) {
    outputLines.push(lines.join(" / "));
  }

  return styleText("gray", outputLines.join("\n"));
}

/**
 * @param {string} fileMentionString
 * @returns {{filePath: string, startLine?: number, endLine?: number} | Error}
 */
function parseFileMention(fileMentionString) {
  const match = fileMentionString.match(/^@([^:]+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) {
    return new Error(
      "Invalid format. Use: @path/to/file[:line] or @path/to/file[:start-end]",
    );
  }
  const [, filePath, startLine, endLine] = match;
  return {
    filePath,
    startLine: startLine ? Number.parseInt(startLine) : undefined,
    endLine: endLine ? Number.parseInt(endLine) : undefined,
  };
}

/**
 * @param {string} filePath
 * @param {number=} startLine
 * @param {number=} endLine
 * @returns {string | Error}
 */
function readFileContent(filePath, startLine, endLine) {
  if (!fs.existsSync(filePath)) {
    return new Error(`File not found: ${filePath}`);
  }

  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    return new Error(
      `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const lines = fileContent.split("\n");

  if (startLine) {
    const start = startLine;
    const end = endLine ? endLine : start;

    if (
      start < 1 ||
      start > lines.length ||
      end < start ||
      end > lines.length
    ) {
      return new Error(`Invalid line range. File has ${lines.length} lines.`);
    }

    return lines.slice(start - 1, end).join("\n");
  }
  return fileContent;
}
