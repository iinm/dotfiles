/**
 * @import { Tool } from '../tool'
 * @import { PatchFileInput } from './patchFile'
 */

import fs from "node:fs/promises";
import path from "node:path";
import { noThrow } from "../utils/noThrow.mjs";

/** @type {Tool} */
export const patchFileTool = {
  def: {
    name: "patch_file",
    description:
      "Modify a file by replacing specific content with new content.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
        },
        diff: {
          description: `
- Content is searched as an exact match including indentation and line breaks.
- The first match found will be replaced if there are multiple matches.
- Use multiple SEARCH/REPLACE blocks to replace multiple contents.

Format:
<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE

<<<<<<< SEARCH
other old content
=======
other new content
>>>>>>> REPLACE
          `.trim(),
          type: "string",
        },
      },
      required: ["filePath", "diff"],
    },
  },

  /**
   * @param {PatchFileInput} input
   * @returns {Promise<string | Error>}
   */
  impl: async (input) =>
    await noThrow(async () => {
      const { filePath, diff } = input;

      const absFilePath = path.resolve(filePath);
      if (!absFilePath.startsWith(process.cwd() + path.sep)) {
        throw new Error(
          "filePath must be within the current working directory",
        );
      }

      const content = await fs.readFile(filePath, "utf8");
      const matches = Array.from(
        diff.matchAll(
          /<<<<<<< SEARCH\n(.*?)\n?=======\n(.*?)\n?>>>>>>> REPLACE/gs,
        ),
      );
      if (matches.length === 0) {
        throw new Error("No matches found in diff.");
      }
      let newContent = content;
      for (const match of matches) {
        const [_, search, replace] = match;
        if (!newContent.includes(search)) {
          throw new Error(
            JSON.stringify(`Search content not found: ${search}`),
          );
        }
        // Escape $ characters in replacement string to prevent interpretation of $& $1 $$ patterns
        const escapedReplace = replace.replace(/\$/g, "$$$$");
        if (replace === "" && newContent.includes(`${search}\n`)) {
          newContent = newContent.replace(`${search}\n`, "");
        } else if (replace === "" && newContent.includes(`\n${search}`)) {
          newContent = newContent.replace(`\n${search}`, "");
        } else {
          newContent = newContent.replace(search, escapedReplace);
        }
      }
      await fs.writeFile(filePath, newContent);
      return `Patched file: ${filePath}`;
    }),

  /**
   * @param {Record<string, unknown>} input
   * @returns {Record<string, unknown>}
   */
  maskApprovalInput: (input) => {
    const patchFileInput = /** @type {PatchFileInput} */ (input);
    return {
      filePath: patchFileInput.filePath,
    };
  },
};
