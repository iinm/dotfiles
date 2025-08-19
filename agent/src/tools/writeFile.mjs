/**
 * @import { Tool } from '../tool'
 * @import { WriteFileInput } from './writeFile'
 */

import fs from "node:fs";
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

      return new Promise((resolve, reject) => {
        fs.writeFile(filePath, content, (error) => {
          if (error) {
            reject(error);
          }
          resolve(`Wrote to file: ${filePath}`);
        });
      });
    }),

  /**
   * @param {Record<string, unknown>} input
   * @returns {Record<string, unknown>}
   */
  maskApprovedInput: (input) => {
    const writeFileInput = /** @type {WriteFileInput} */ (input);
    return {
      filePath: writeFileInput.filePath,
    };
  },
};
