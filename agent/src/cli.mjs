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
  });

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
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

    if (inputTrimmed.toLowerCase() === "help") {
      console.log(
        `
Request:
  read request

Workflow:
  use workflow
  save workflow

Session:
  resume
  bye

Memory:
  save memory
  resume work
      `.trim(),
      );
      cli.prompt();
      return;
    }

    if (inputTrimmed.startsWith("@")) {
      const filePath = inputTrimmed.slice(1);
      if (!fs.existsSync(filePath)) {
        console.error(styleText("red", `\nFile not found: ${filePath}`));
        cli.prompt();
        return;
      }
      const fileContent = fs.readFileSync(filePath, "utf-8");
      userEventEmitter.emit("userInput", fileContent);
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
    console.error(
      styleText(
        "red",
        `\nError: message=${error.message}, stack=${error.stack}`,
      ),
    );
  });

  agentEventEmitter.on("turnEnd", () => {
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
