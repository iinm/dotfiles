/**
 * @import { CliOptions } from "./cli"
 * @import { Message, MessageContentToolResult, MessageContentToolUse, ProviderTokenUsage } from "./model"
 * @import { ExecCommandInput } from "./tools/execCommand"
 * @import { PatchFileInput } from "./tools/patchFile"
 * @import { WriteFileInput } from "./tools/writeFile"
 * @import { TmuxCommandInput } from "./tools/tmuxCommand"
 * @import { TavilySearchInput } from "./tools/tavilySearch"
 */

import readline from "node:readline";
import { styleText } from "node:util";

/**
 * @param {CliOptions} options
 */
export function startCLI({
  userEventEmitter,
  agentEventEmitter,
  sessionId,
  modelName,
}) {
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${styleText(
      ["white", "bgGray"],
      `\nSession: ${sessionId}, Model: ${modelName}, Commands: "resume work", "save memory", "bye"`,
    )}\n> `,
  });

  cli.on("line", async (input) => {
    const inputTrimmed = input.trim();
    if (inputTrimmed.length === 0) {
      cli.prompt();
      return;
    }

    userEventEmitter.emit("userInput", inputTrimmed);
    cli.pause();
  });

  agentEventEmitter.on("message", (message) => {
    printMessage(message);
  });

  agentEventEmitter.on("toolUseRequest", () => {
    console.log(styleText("yellow", "\nApprove tool calls? (y or feedback)"));
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
    cli.resume();
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
      console.log(styleText("bold", "\nAgent:"));
      for (const part of message.content) {
        switch (part.type) {
          case "text":
            console.log(part.text);
            break;
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

  if (isError) {
    return styleText("red", content);
  }

  if (toolResult.toolName === "exec_command") {
    const omittedContent = content.match(
      /<command>(cat|head|tail|sed)<\/command>/,
    )
      ? "<stdout>(Output omitted)</stdout>"
      : content;
    return omittedContent
      .replace(/(^<stdout>|<\/stdout>$)/gm, styleText("blue", "$1"))
      .replace(/(^<stderr>|<\/stderr>$)/gm, styleText("magenta", "$1"))
      .replace(/(^<error>|<\/error>$)/gm, styleText("red", "$1"));
  }

  if (toolResult.toolName === "tmux_command") {
    return content
      .replace(/(^<stdout>|<\/stdout>$)/gm, styleText("blue", "$1"))
      .replace(/(^<stderr>|<\/stderr>$)/gm, styleText("magenta", "$1"))
      .replace(/(^<error>|<\/error>$)/gm, styleText("red", "$1"))
      .replace(/(^<tmux.*?>|<\/tmux:.*?>$)/gm, styleText("green", "$1"));
  }

  const maxLength = 1024 * 2;
  if (content.length > maxLength) {
    return `${content.slice(0, maxLength)}... (Content omitted)`;
  }

  return content;
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
    } else {
      lines.push(
        `(${key}) ${Object.entries(value)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}`,
      );
    }
  }
  return styleText("gray", [`\n${header.join(", ")}`, ...lines].join("\n"));
}
