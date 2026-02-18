/**
 * @import { Message, MessageContentToolResult, MessageContentToolUse, ProviderTokenUsage } from "./model"
 * @import { UserEventEmitter, AgentEventEmitter, AgentCommands } from "./agent"
 * @import { ExecCommandInput } from "./tools/execCommand"
 * @import { PatchFileInput } from "./tools/patchFile"
 * @import { WriteFileInput } from "./tools/writeFile"
 * @import { TmuxCommandInput } from "./tools/tmuxCommand"
 * @import { TavilySearchInput } from "./tools/tavilySearch"
 */

import { execFileSync } from "node:child_process";
import readline from "node:readline";
import { styleText } from "node:util";
import { createPatch } from "diff";
import { consumeInterruptMessage } from "./utils/consumeInterruptMessage.mjs";
import { loadPrompts } from "./utils/loadPrompts.mjs";
import { loadUserMessageContext } from "./utils/loadUserMessageContext.mjs";
import { notify } from "./utils/notify.mjs";
import { parseFileRange } from "./utils/parseFileRange.mjs";
import { readFileRange } from "./utils/readFileRange.mjs";

// Define available slash commands for tab completion
const SLASH_COMMANDS = [
  "/help",
  "/prompts",
  "/prompts:",
  "/paste",
  "/resume",
  "/dump",
  "/load",
];

/**
 * Return the longest common prefix of the given strings.
 * @param {string[]} strings
 * @returns {string}
 */
function commonPrefix(strings) {
  if (strings.length === 0) return "";
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

/**
 * Display completion candidates and invoke the readline callback.
 *
 * Node.js readline normally requires two consecutive Tab presses to show the
 * candidate list. This helper lets readline handle the common-prefix
 * auto-completion first, then prints the candidate list on the next tick and
 * redraws the prompt so the display stays clean.
 *
 * @param {import("node:readline").Interface} rl
 * @param {string[]} candidates
 * @param {string} line
 * @param {(err: Error | null, result: [string[], string]) => void} callback
 */
function showCompletions(rl, candidates, line, callback) {
  if (candidates.length <= 1) {
    callback(null, [candidates, line]);
    return;
  }
  const prefix = commonPrefix(candidates);
  if (prefix.length > line.length) {
    // Let readline insert the common prefix.
    callback(null, [[prefix], line]);
  } else {
    // Nothing new to insert.
    callback(null, [[], line]);
  }
  // After readline finishes its own refresh, print the candidate list and
  // redraw the prompt line.  We cannot use rl.prompt(true) because its
  // internal _refreshLine clears everything below the prompt start, which
  // erases the candidate list we just wrote.  Instead we manually re-output
  // the prompt and current line content.
  setTimeout(() => {
    process.stdout.write(`\r\n${candidates.join("  ")}\r\n`);
    process.stdout.write(`${rl.getPrompt()}${rl.line}`);
  }, 0);
}

const HELP_MESSAGE = `
Commands:
  /help         - Display this help message
  /prompts      - List available prompts
  /prompts:<id> - Invoke a prompt with the given ID (e.g., /prompts:code-simplifier)
  /<id>         - Shortcut for prompts in the shortcuts/ directory (e.g., /commit)
  /paste        - Paste content from clipboard
  /resume       - Resume conversation after an LLM provider error
  /dump         - Save current messages to a JSON file
  /load         - Load messages from a JSON file

File Input Syntax:
  !path/to/file     - Read content from a file
  !path/to/file:N   - Read line N from a file
  !path/to/file:N-M - Read lines N to M from a file

References (use within input content):
  @path/to/file     - Reference content from another file
  @path/to/file:N   - Reference line N from another file
  @path/to/file:N-M - Reference lines N to M from another file

Image Attachments (use within input content):
  @path/to/image.png      - Attach an image (png, jpg, jpeg, gif, webp)
  @'path/with spaces.png' - Quote paths that include spaces
  @path/with\\ spaces.png  - Escape spaces with a backslash
`
  .trim()
  .replace(/^[^ ].*:/gm, (m) => styleText("bold", m))
  .replace(/^ {2}\/.+?(?= - )/gm, (m) => styleText("cyan", m))
  .replace(/^ {2}.+?(?= - )/gm, (m) => styleText("blue", m));

const MAX_DISPLAY_OUTPUT_LENGTH = 1024;

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

  /**
   * @param {string} id
   * @param {string} args
   * @param {string} displayInvocation
   */
  const invokePrompt = async (id, args, displayInvocation) => {
    const prompts = await loadPrompts();
    const prompt = prompts.get(id);

    if (!prompt) {
      console.log(styleText("red", `\nPrompt not found: ${id}`));
      cli.prompt();
      return;
    }

    const invocation = `${displayInvocation}${args ? ` ${args}` : ""}`;
    const message = `System: This prompt was invoked as "${invocation}".\n\n${prompt.content}`;

    console.log(styleText("gray", "\n<prompt>"));
    console.log(message);
    console.log(styleText("gray", "</prompt>"));

    userEventEmitter.emit("userInput", [{ type: "text", text: message }]);
    state.turn = false;
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
     * @param {(err?: Error | null, result?: [string[], string]) => void} callback
     */
    completer: (line, callback) => {
      (async () => {
        try {
          const prompts = await loadPrompts();
          if (line.startsWith("/prompts:")) {
            const ids = Array.from(prompts.keys()).map(
              (id) => `/prompts:${id}`,
            );
            const hits = ids.filter((id) => id.startsWith(line));
            showCompletions(cli, hits.length ? hits : ids, line, callback);
            return;
          }

          if (line.startsWith("/")) {
            const shortcuts = Array.from(prompts.values())
              .filter((p) => p.isShortcut)
              .map((p) => `/${p.id}`);
            const allCommands = [...SLASH_COMMANDS, ...shortcuts];
            const hits = allCommands.filter((c) => c.startsWith(line));
            showCompletions(
              cli,
              hits.length ? hits : allCommands,
              line,
              callback,
            );
            return;
          }
          callback(null, [[], line]);
        } catch (err) {
          callback(err instanceof Error ? err : new Error(String(err)), [
            [],
            line,
          ]);
        }
      })();
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

    // clear interrupt message
    await consumeInterruptMessage();

    if (["/help", "help"].includes(inputTrimmed.toLowerCase())) {
      console.log(`\n${HELP_MESSAGE}`);
      cli.prompt();
      return;
    }

    // Handle file reading when message starts with @
    if (inputTrimmed.startsWith("!")) {
      const fileRange = parseFileRange(inputTrimmed.slice(1));
      if (fileRange instanceof Error) {
        console.log(styleText("red", `\n${fileRange.message}`));
        cli.prompt();
        return;
      }

      const fileContent = await readFileRange(fileRange);
      if (fileContent instanceof Error) {
        console.log(styleText("red", `\n${fileContent.message}`));
        cli.prompt();
        return;
      }

      console.log(styleText("gray", "\n<input>"));
      console.log(fileContent);
      console.log(styleText("gray", "</input>"));

      const messageWithContext = await loadUserMessageContext(fileContent);

      userEventEmitter.emit("userInput", messageWithContext);
      state.turn = false;
      return;
    }

    if (inputTrimmed.toLowerCase() === "/dump") {
      await agentCommands.dumpMessages();
      cli.prompt();
      return;
    }

    if (inputTrimmed.toLowerCase() === "/load") {
      await agentCommands.loadMessages();
      cli.prompt();
      return;
    }

    if (inputTrimmed.startsWith("/prompts")) {
      const prompts = await loadPrompts();

      if (inputTrimmed === "/prompts") {
        console.log(styleText("bold", "\nAvailable Prompts:"));
        if (prompts.size === 0) {
          console.log("  No prompts found.");
        } else {
          for (const prompt of prompts.values()) {
            const maxLength = process.stdout.columns ?? 100;
            const line = `  ${styleText("cyan", prompt.id.padEnd(20))} - ${prompt.description}`;
            console.log(
              line.length > maxLength ? `${line.slice(0, maxLength)}...` : line,
            );
          }
        }
        cli.prompt();
        return;
      }

      if (inputTrimmed.startsWith("/prompts:")) {
        const match = inputTrimmed.match(/^\/prompts:([^ ]+)(?:\s+(.*))?$/);
        if (!match) {
          console.log(styleText("red", "\nInvalid prompt invocation format."));
          cli.prompt();
          return;
        }
        await invokePrompt(match[1], match[2] || "", `/prompts:${match[1]}`);
        return;
      }
    }

    if (inputTrimmed.startsWith("/paste")) {
      const prompt = inputTrimmed.slice("/paste".length).trim();
      let clipboard;
      try {
        if (process.platform === "darwin") {
          clipboard = execFileSync("pbpaste", { encoding: "utf8" });
        } else if (process.platform === "linux") {
          clipboard = execFileSync("xsel", ["--clipboard", "--output"], {
            encoding: "utf8",
          });
        } else {
          console.log(
            styleText(
              "red",
              `\nUnsupported platform for /paste: ${process.platform}`,
            ),
          );
          cli.prompt();
          return;
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.log(
          styleText(
            "red",
            `\nFailed to get clipboard content: ${errorMessage}`,
          ),
        );
        cli.prompt();
        return;
      }

      const combinedInput = prompt ? `${prompt}\n\n${clipboard}` : clipboard;

      console.log(styleText("gray", "\n<paste>"));
      console.log(combinedInput);
      console.log(styleText("gray", "</paste>"));

      const messageWithContext = await loadUserMessageContext(combinedInput);
      userEventEmitter.emit("userInput", messageWithContext);
      state.turn = false;
      return;
    }

    // Handle shortcuts for prompts in shortcuts/ directory
    if (inputTrimmed.startsWith("/")) {
      const match = inputTrimmed.match(/^\/([^ ]+)(?:\s+(.*))?$/);
      if (match) {
        const id = match[1];
        const prompts = await loadPrompts();
        const prompt = prompts.get(id);

        if (prompt?.isShortcut) {
          await invokePrompt(id, match[2] || "", `/${id}`);
          return;
        }
      }
    }

    const messageWithContext = await loadUserMessageContext(inputTrimmed);
    userEventEmitter.emit("userInput", messageWithContext);
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
      `commnad: ${JSON.stringify(execCommandInput.command)}`,
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

  const { provider: _, ...filteredToolUse } = toolUse;

  return JSON.stringify(filteredToolUse, null, 2);
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
      .replace(/(^<tmux:.*?>|<\/tmux:.*?>$)/gm, styleText("green", "$1"));
  }

  if (contentString.length > MAX_DISPLAY_OUTPUT_LENGTH) {
    return [
      contentString.slice(0, MAX_DISPLAY_OUTPUT_LENGTH),
      styleText("yellow", "... (Output truncated for display)"),
      "\n",
    ].join("");
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
