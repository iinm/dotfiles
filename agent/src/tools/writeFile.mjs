/**
 * @import { Tool } from '../tool'
 * @import { WriteFileInput } from './writeFile'
 */

import fs from "node:fs/promises";
import path from "node:path";
import { noThrow } from "../utils/noThrow.mjs";

/** @type {Tool} */
export const writeFileTool = {
  def: {
    name: "write_file",
    description: "Write a file",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
        },
        content: {
          type: "string",
        },
      },
      required: ["filePath", "content"],
    },
  },

  /**
   * @param {WriteFileInput} input
   * @returns {Promise<string | Error>}
   */
  impl: async (input) =>
    await noThrow(async () => {
      const { filePath, content } = input;

      const absFilePath = path.resolve(filePath);
      if (!absFilePath.startsWith(process.cwd() + path.sep)) {
        throw new Error(
          "filePath must be within the current working directory",
        );
      }

      // Ensure the destination directory exists before writing
      const dir = path.dirname(absFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(absFilePath, content, "utf8");
      return `Wrote to file: ${filePath}`;
    }),

  /**
   * @param {Record<string, unknown>} input
   * @returns {Record<string, unknown>}
   */
  maskApprovalInput: (input) => {
    const writeFileInput = /** @type {WriteFileInput} */ (input);
    return {
      filePath: writeFileInput.filePath,
    };
  },
};
