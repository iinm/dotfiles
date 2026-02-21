import { styleText } from "node:util";

/**
 * @import { MessageContentToolResult } from "../model"
 */

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
