/**
 * @import { MessageContentToolUse, MessageContentToolResult, ProviderTokenUsage } from "./model"
 * @import { ExecCommandInput } from "./tools/execCommand"
 * @import { PatchFileInput } from "./tools/patchFile"
 * @import { WriteFileInput } from "./tools/writeFile"
 * @import { TmuxCommandInput } from "./tools/tmuxCommand"
 * @import { TavilySearchInput } from "./tools/tavilySearch"
 * @import { DelegateToSubagentInput } from "./tools/delegateToSubagent"
 */

import { styleText } from "node:util";
import { createPatch } from "diff";

/**
 * Format tool use for display.
 * @param {MessageContentToolUse} toolUse
 * @returns {string}
 */
export function formatToolUse(toolUse) {
  const { toolName, input } = toolUse;

  if (toolName === "exec_command") {
    /** @type {Partial<ExecCommandInput>} */
    const execCommandInput = input;
    return [
      `tool: ${toolName}`,
      `command: ${JSON.stringify(execCommandInput.command)}`,
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
      `command: ${tmuxCommandInput.command}`,
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

  if (toolName === "delegate_to_subagent") {
    /** @type {Partial<DelegateToSubagentInput>} */
    const delegateInput = input;
    return [
      `tool: ${toolName}`,
      `name: ${delegateInput.name}`,
      `goal: ${delegateInput.goal}`,
    ].join("\n");
  }

  const { provider: _, ...filteredToolUse } = toolUse;

  return JSON.stringify(filteredToolUse, null, 2);
}

/** Maximum length of output to display */
const MAX_DISPLAY_OUTPUT_LENGTH = 1024;

/**
 * Format tool result for display.
 * @param {MessageContentToolResult} toolResult
 * @returns {string}
 */
export function formatToolResult(toolResult) {
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
 * Format provider token usage for display.
 * @param {ProviderTokenUsage} usage
 * @returns {string}
 */
export function formatProviderTokenUsage(usage) {
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
