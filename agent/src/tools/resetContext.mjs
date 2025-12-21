/**
 * @import { Tool } from '../tool'
 */

import fs from "node:fs/promises";
import path from "node:path";
import { noThrow } from "../utils/noThrow.mjs";

/**
 * @typedef {Object} ResetContextInput
 * @property {string} memoryPath
 */

/** @type {Tool} */
export const resetContextTool = {
  def: {
    name: "reset_context",
    description: "Reset context and read the specified task memory file.",
    inputSchema: {
      type: "object",
      properties: {
        memoryPath: {
          type: "string",
        },
        reason: {
          type: "string",
          description: "The reason for resetting the context.",
        },
      },
      required: ["memoryPath", "reason"],
    },
  },

  /**
   * @param {ResetContextInput} input
   * @returns {Promise<string | Error>}
   */
  impl: async (input) =>
    await noThrow(async () => {
      const workingDir = process.cwd();
      const absolutePath = path.resolve(input.memoryPath);
      const relativePath = path.relative(workingDir, absolutePath);
      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return new Error(
          "Access denied: memoryPath must be within the working directory",
        );
      }

      return fs.readFile(absolutePath, { encoding: "utf-8" });
    }),
};
