/**
 * @import { Message, MessageContentToolResult, MessageContentToolUse, ProviderTokenUsage } from "./model"
 * @import { UserEventEmitter, AgentEventEmitter } from "./agent"
 * @import { ExecCommandInput } from "./tools/execCommand"
 * @import { PatchFileInput } from "./tools/patchFile"
 * @import { WriteFileInput } from "./tools/writeFile"
 * @import { TmuxCommandInput } from "./tools/tmuxCommand"
 * @import { TavilySearchInput } from "./tools/tavilySearch"
 */

import fs from "node:fs";
import readline from "node:readline";
import { styleText } from "node:util";
import { notify } from "./utils/notify.mjs";

// Define available slash commands for tab completion
const SLASH_COMMANDS = [
  "/help",
  "/commit",
  "/commit.no-co-author",
  "/memory.save",
  "/memory.resume",
  "/clear",
  "/bye",
  "/debug.resume",
  "/debug.msg.pop",
  "/debug.msg.dump",
  "/debug.msg.load",
];

/**
 * @typedef {object} CliOptions
 * @property {UserEventEmitter} userEventEmitter
 * @property {AgentEventEmitter} agentEventEmitter
 * @property {string} sessionId
 * @property {string} modelName
 * @property {() => Promise<void>} onStop
 */

/**
 * @param {CliOptions} options
 */
export function startCLI({
  userEventEmitter,
  agentEventEmitter,
  sessionId,
  modelName,
  onStop,
}) {
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${styleText(["white", "bgGray"], `\nSession: ${sessionId}, Model: ${modelName}`)}\n> `,
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
      process.exit(1);
    }

    if (key.ctrl && key.name === "d") {
      await onStop();
      process.exit(0);
    }
  });

  cli.on("line", async (input) => {
    const inputTrimmed = input.trim();

    if (inputTrimmed.length === 0) {
      cli.prompt();
      return;
    }

    if (["/help", "help"].includes(inputTrimmed.toLowerCase())) {
      console.log(
        `
File Input Syntax:
  @path/to/file          - Read content from a file
  @path/to/file:N        - Read line N from a file
  @path/to/file:N-M      - Read lines N to M from a file

Commands:
  /help                - Display this help message
  /commit              - Create a commit message based on staged changes
  /commit.no-co-author - Create a commit without Co-authored-by
  /memory.save         - Save the current task state to memory
  /memory.resume       - Load a previously saved task memory
  /clear               - Clear conversation
  /bye                 - End the session and clean up resources (including tmux sessions)
  /debug.resume        - Resume conversation after an LLM provider error
  /debug.msg.pop       - Remove last message
  /debug.msg.dump      - Save current messages to a JSON file
  /debug.msg.load      - Load messages from a JSON file
      `.trim(),
      );
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
      return;
    }

    if (inputTrimmed.toLowerCase() === "/commit") {
      const message = `
Create a commit.
- Run \`git diff --staged\` to understand the staged changes.
- Check the commit message format by running \`git log --no-merges --oneline -n 10\`.
- Create a concise and descriptive commit message that follows the project's commit convention.
- Use this exact format to include Co-authored-by information: 
  git ["commit", "-m", "<commit message>", "-m", "", "-m", "Co-authored-by: Agent by iinm <agent-by-iinm@localhost>"]
      `.trim();
      console.log(styleText("gray", "\n<command>"));
      console.log(message);
      console.log(styleText("gray", "</command>"));

      userEventEmitter.emit("userInput", message);
      return;
    }

    if (inputTrimmed.toLowerCase() === "/commit.no-co-author") {
      const message = `
Create a commit.
- Run \`git diff --staged\` to understand the staged changes.
- Check the commit message format by running \`git log --no-merges --oneline -n 10\`.
- Create a concise and descriptive commit message that follows the project's commit convention.
- Create a commit: git ["commit", "-m", "<commit message>"]
      `.trim();
      console.log(styleText("gray", "\n<command>"));
      console.log(message);
      console.log(styleText("gray", "</command>"));

      userEventEmitter.emit("userInput", message);
      return;
    }

    if (inputTrimmed.toLowerCase() === "/memory.save") {
      const message = "System: Save task memory.".trim();
      console.log(styleText("gray", "\n<command>"));
      console.log(message);
      console.log(styleText("gray", "</command>"));

      userEventEmitter.emit("userInput", message);
      return;
    }

    if (inputTrimmed.toLowerCase() === "/memory.resume") {
      const message = `
Load task memory and resume work.
- Display available task memory files and prompt the user to select one.
- Read the content of the selected memory file after the user selects it.
      `.trim();
      console.log(styleText("gray", "\n<command>"));
      console.log(message);
      console.log(styleText("gray", "</command>"));

      userEventEmitter.emit("userInput", message);
      return;
    }

    if (inputTrimmed.toLowerCase() === "/bye") {
      const message = `
System: Conversation has ended.
- Kill the tmux session named agent-${sessionId}.
      `.trim();
      console.log(styleText("gray", "\n<command>"));
      console.log(message);
      console.log(styleText("gray", "</command>"));

      userEventEmitter.emit("userInput", message);
      return;
    }

    userEventEmitter.emit("userInput", inputTrimmed);
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
    console.log(
      styleText(
        "yellow",
        "\nApprove tool calls? (y = allow once, Y = allow in this session, or feedback)",
      ),
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
    const err = await notify();
    if (err) {
      console.error(
        styleText("yellow", `\nNotification error: ${err.message}`),
      );
    }
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
    const highlightedDiff = (patchFileInput.diff || "").replace(
      /<<<<<<< SEARCH\n(.*?)\n?=======\n(.*?)\n?>>>>>>> REPLACE/gs,
      (_match, search, replace) => {
        return [
          "<<<<<<< SEARCH",
          styleText("red", search),
          "=======",
          styleText("green", replace),
          ">>>>>>> REPLACE",
        ].join("\n");
      },
    );
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

  if (toolName === "web_search") {
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
    const omittedContent = contentString.match(
      /<command>(cat|head|tail|sed)<\/command>/,
    )
      ? "<stdout>(Output omitted)</stdout>"
      : contentString;
    return omittedContent
      .replace(/(^<stdout>|<\/stdout>$)/gm, styleText("blue", "$1"))
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
