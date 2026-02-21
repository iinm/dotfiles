import { styleText } from "node:util";
import { createPatch } from "diff";

/**
 * @import { MessageContentToolUse } from "../model"
 * @import { ExecCommandInput } from "../tools/execCommand"
 * @import { PatchFileInput } from "../tools/patchFile"
 * @import { WriteFileInput } from "../tools/writeFile"
 * @import { TmuxCommandInput } from "../tools/tmuxCommand"
 * @import { TavilySearchInput } from "../tools/tavilySearch"
 */

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
