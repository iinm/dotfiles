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
    description: "Run a command without shell interpretation.",
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
          {
            shell: false,
            env: {
              PWD: process.env.PWD,
              PATH: process.env.PATH,
              HOME: process.env.HOME,
            },
            timeout: 120 * 1000,
          },
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
                  "Output too large. Use rg / sed to read specific parts.",
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
              // rg: 何もマッチしない場合は exit status != 0 になるので無視
              const ignoreError = ["rg"].includes(command);
              if (!ignoreError) {
                // err.message が長過ぎる場合は先頭を表示
                const errMessageOmitted = err.message.slice(
                  0,
                  OUTPUT_MAX_LENGTH,
                );
                const isErrMessageOmitted =
                  err.message.length > OUTPUT_MAX_LENGTH;
                result.push(
                  `\n<error>\n${err.name}: ${errMessageOmitted}${isErrMessageOmitted ? "... (Message omitted)" : ""}</error>`,
                );
              }
            }
            return resolve(result.join("\n"));
          },
        );
      });
    }),
};
