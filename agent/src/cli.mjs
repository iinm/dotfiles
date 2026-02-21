/**
 * @import { Message } from "./model"
 * @import { UserEventEmitter, AgentEventEmitter, AgentCommands } from "./agent"
 */

import { execFileSync } from "node:child_process";
import readline from "node:readline";
import { styleText } from "node:util";
import { formatProviderTokenUsage } from "./formatters/tokenUsage.mjs";
import { formatToolResult } from "./formatters/toolResult.mjs";
import { formatToolUse } from "./formatters/toolUse.mjs";
import { consumeInterruptMessage } from "./utils/consumeInterruptMessage.mjs";
import { loadPrompts } from "./utils/loadPrompts.mjs";
import { loadUserMessageContext } from "./utils/loadUserMessageContext.mjs";
import { notify } from "./utils/notify.mjs";
import { parseFileRange } from "./utils/parseFileRange.mjs";
import { readFileRange } from "./utils/readFileRange.mjs";

// Define available slash commands for tab completion
const SLASH_COMMANDS = [
  { name: "/help", description: "Display this help message" },
  { name: "/prompts", description: "List available prompts" },
  {
    name: "/prompts:<id>",
    description:
      "Invoke a prompt with the given ID (e.g., /prompts:code-simplifier)",
  },
  {
    name: "/<id>",
    description:
      "Shortcut for prompts in the shortcuts/ directory (e.g., /commit)",
  },
  { name: "/paste", description: "Paste content from clipboard" },
  {
    name: "/resume",
    description: "Resume conversation after an LLM provider error",
  },
  { name: "/dump", description: "Save current messages to a JSON file" },
  { name: "/load", description: "Load messages from a JSON file" },
];

/**
 * @typedef {Object} CompletionCandidate
 * @property {string} name
 * @property {string} description
 */

/**
 * Find candidates that match the line, prioritizing prefix matches.
 * @param {(string | CompletionCandidate)[]} candidates
 * @param {string} line
 * @param {number} queryStartIndex
 * @returns {(string | CompletionCandidate)[]}
 */
function findMatches(candidates, line, queryStartIndex) {
  const query = line.slice(queryStartIndex);
  const prefixMatches = [];
  const partialMatches = [];

  for (const candidate of candidates) {
    const name = typeof candidate === "string" ? candidate : candidate.name;
    if (name.startsWith(line)) {
      prefixMatches.push(candidate);
    } else if (
      query.length > 0 &&
      name.slice(queryStartIndex).includes(query)
    ) {
      partialMatches.push(candidate);
    }
  }

  return [...prefixMatches, ...partialMatches];
}

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
 * @param {(string | CompletionCandidate)[]} candidates
 * @param {string} line
 * @param {(err: Error | null, result: [string[], string]) => void} callback
 */
function showCompletions(rl, candidates, line, callback) {
  const names = candidates.map((c) => (typeof c === "string" ? c : c.name));
  if (candidates.length <= 1) {
    callback(null, [names, line]);
    return;
  }
  const prefix = commonPrefix(names);
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
    const maxLength = process.stdout.columns ?? 100;
    const list = candidates
      .map((c) => {
        if (typeof c === "string") return c;
        const nameText = c.name.padEnd(25);
        const separator = " - ";
        const descText = c.description;

        // 画面幅に合わせて説明文をカット（色を付ける前に計算）
        const availableWidth =
          maxLength - nameText.length - separator.length - 3;
        const displayDesc =
          descText.length > availableWidth && availableWidth > 0
            ? `${descText.slice(0, availableWidth)}...`
            : descText;

        const name = styleText("cyan", nameText);
        const description = styleText("dim", displayDesc);
        return `${name}${separator}${description}`;
      })
      .join("\r\n");
    process.stdout.write(`\r\n${list}\r\n`);
    process.stdout.write(`${rl.getPrompt()}${rl.line}`);
  }, 0);
}

const HELP_MESSAGE = [
  "Commands:",
  ...SLASH_COMMANDS.map(
    (cmd) => `  ${cmd.name.padEnd(13)} - ${cmd.description}`,
  ),
  "",
  "Multi-line Input Syntax:",
  '  """               - Start/stop multi-line input mode',
  "",
  "File Input Syntax:",
  "  !path/to/file     - Read content from a file",
  "  !path/to/file:N   - Read line N from a file",
  "  !path/to/file:N-M - Read lines N to M from a file",
  "",
  "References (use within input content):",
  "  @path/to/file     - Reference content from another file",
  "  @path/to/file:N   - Reference line N from another file",
  "  @path/to/file:N-M - Reference lines N to M from another file",
  "",
  "Image Attachments (use within input content):",
  "  @path/to/image.png      - Attach an image (png, jpg, jpeg, gif, webp)",
  "  @'path/with spaces.png' - Quote paths that include spaces",
  "  @path/with\\ spaces.png  - Escape spaces with a backslash",
]
  .join("\n")
  .trim()
  .replace(/^[^ ].*:/gm, (m) => styleText("bold", m))
  .replace(/^ {2}\/.+?(?= - )/gm, (m) => styleText("cyan", m))
  .replace(/^ {2}.+?(?= - )/gm, (m) => styleText("blue", m));

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
  /** @type {{ turn: boolean, multiLineBuffer: string[] | null, subagentName: string }} */
  const state = {
    turn: true,
    multiLineBuffer: null,
    subagentName: "",
  };

  /**
   * @param {string} id
   * @param {string} args
   * @param {string} displayInvocation
   * @returns {Promise<void>}
   */
  async function invokePrompt(id, args, displayInvocation) {
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
  }

  const getCliPrompt = (subagentName = "") =>
    [
      "",
      styleText(
        ["white", "bgGray"],
        styleText(["cyanBright", "bgGray"], "▌") +
          (subagentName ? `(${subagentName}) ` : "") +
          `Session: ${sessionId}, Model: ${modelName}, Sandbox: ${sandbox ? "on" : "off"} `,
      ),
      "> ",
    ].join("\n");

  let currentCliPrompt = getCliPrompt();
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: currentCliPrompt,
    /**
     * @param {string} line
     * @param {(err?: Error | null, result?: [string[], string]) => void} callback
     */
    completer: (line, callback) => {
      (async () => {
        try {
          const prompts = await loadPrompts();

          if (line.startsWith("/prompts:")) {
            const prefix = "/prompts:";
            const candidates = Array.from(prompts.values()).map((p) => ({
              name: `${prefix}${p.id}`,
              description: p.description,
            }));
            const hits = findMatches(candidates, line, prefix.length);

            showCompletions(cli, hits, line, callback);
            return;
          }

          if (line.startsWith("/")) {
            const shortcuts = Array.from(prompts.values())
              .filter((p) => p.isShortcut)
              .map((p) => ({
                name: `/${p.id}`,
                description: p.description,
              }));

            const allCommands = [...SLASH_COMMANDS, ...shortcuts].filter(
              (cmd) => {
                const name = typeof cmd === "string" ? cmd : cmd.name;
                return (
                  name !== "/<id>" &&
                  (name === "/prompts:" || !name.startsWith("/prompt:"))
                );
              },
            );

            const hits = findMatches(allCommands, line, 1);

            showCompletions(cli, hits, line, callback);
            return;
          }

          callback(null, [[], line]);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          callback(error, [[], line]);
        }
      })();
    },
  });

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
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

  /**
   * Process the complete user input.
   * @param {string} input
   * @returns {Promise<void>}
   */
  async function processInput(input) {
    const inputTrimmed = input.trim();

    if (inputTrimmed.length === 0) {
      cli.prompt();
      return;
    }

    cli.setPrompt(currentCliPrompt);
    await consumeInterruptMessage();

    if (["/help", "help"].includes(inputTrimmed.toLowerCase())) {
      console.log(`\n${HELP_MESSAGE}`);
      cli.prompt();
      return;
    }

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
  }

  cli.on("line", async (lineInput) => {
    if (!state.turn) {
      console.warn(
        styleText(
          "yellow",
          `\nAgent is working. Ignore input: ${lineInput.trim()}`,
        ),
      );
      return;
    }

    // Handle multi-line delimiter
    if (lineInput.trim() === '"""') {
      if (state.multiLineBuffer === null) {
        state.multiLineBuffer = [];
        cli.setPrompt(styleText("gray", "... "));
        cli.prompt();
        return;
      }

      const combined = state.multiLineBuffer.join("\n");
      state.multiLineBuffer = null;
      cli.setPrompt(currentCliPrompt);

      await processInput(combined);
      return;
    }

    // Accumulate lines if in multi-line mode
    if (state.multiLineBuffer !== null) {
      state.multiLineBuffer.push(lineInput);
      cli.prompt();
      return;
    }

    await processInput(lineInput);
  });

  agentEventEmitter.on("partialMessageContent", (partialContent) => {
    if (partialContent.position === "start") {
      const subagentPrefix = state.subagentName
        ? `[${styleText("cyan", state.subagentName)}]\n`
        : "";
      console.log(
        styleText("gray", `\n${subagentPrefix}<${partialContent.type}>`),
      );
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
        currentCliPrompt,
      ].join("\n"),
    );
  });

  agentEventEmitter.on("subagentStatus", (status) => {
    state.subagentName = status?.name || "";
    currentCliPrompt = getCliPrompt(state.subagentName);
    cli.setPrompt(currentCliPrompt);
    cli.prompt();
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
