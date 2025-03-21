/**
 * @import { Tool } from '../tool'
 * @import { ExecCommandInput } from './execCommand'
 */

import { execFile } from "node:child_process";
import { noThrow } from "../utils/noThrow.mjs";

const OUTPUT_MAX_LENGTH = 1024 * 8;

/** @type {Tool} */
export const execCommandTool = {
  def: {
    name: "exec_command",
    description: "Execute a command",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
        },
        args: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      required: ["command"],
    },
  },

  /**
   * @param {ExecCommandInput} input
   * @returns {Promise<string | Error>}
   */
  impl: async (input) =>
    await noThrow(async () => {
      const { command, args } = input;
      return new Promise((resolve, reject) => {
        execFile(
          command,
          args,
          { timeout: 20 * 1000 },
          (err, stdout, stderr) => {
            if (
              [
                "ls",
                "cat",
                "head",
                "tail",
                "sed",
                "fd",
                "rg",
                "find",
                "grep",
              ].includes(command) &&
              stdout.length > OUTPUT_MAX_LENGTH
            ) {
              return reject(
                new Error(
                  `Output too large. Here is the head of the output:\n\n${stdout.slice(0, 300)}... (Output omitted)`,
                ),
              );
            }

            // stdout / stderr が長過ぎる場合は末尾を表示
            const stdoutOmitted = stdout.slice(-OUTPUT_MAX_LENGTH);
            const isStdoutOmitted = stdout.length > OUTPUT_MAX_LENGTH;
            const stderrOmitted = stderr.slice(-OUTPUT_MAX_LENGTH);
            const isStderrOmitted = stderr.length > OUTPUT_MAX_LENGTH;
            const result = [
              `<command>${command}</command>`,
              "",
              stdoutOmitted
                ? `<stdout>\n${isStdoutOmitted ? "(Output omitted) ..." : ""}${stdoutOmitted}</stdout>`
                : "<stdout></stdout>",
              "",
              stderrOmitted
                ? `<stderr>\n${isStderrOmitted ? "(Output omitted) ..." : ""}${stderrOmitted}</stderr>`
                : "<stderr></stderr>",
            ];
            if (err) {
              // err.message が長過ぎる場合は先頭を表示
              const errMessageOmitted = err.message.slice(0, OUTPUT_MAX_LENGTH);
              const isErrMessageOmitted =
                err.message.length > OUTPUT_MAX_LENGTH;
              result.push(
                `\n<error>\n${err.name}: ${errMessageOmitted}${isErrMessageOmitted ? "... (Message omitted)" : ""}</error>`,
              );
            }
            return resolve(result.join("\n"));
          },
        );
      });
    }),
};
