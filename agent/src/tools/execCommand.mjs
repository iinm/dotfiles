/**
 * @import { Tool } from '../tool'
 * @import { ExecCommandInput } from './execCommand'
 */

import { execFile } from "node:child_process";
import { noThrow } from "../utils/noThrow.mjs";
import { writeTmpFile } from "../utils/tmpfile.mjs";

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
      return new Promise((resolve, _reject) => {
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
            timeout: 5 * 60 * 1000,
          },
          async (err, stdout, stderr) => {
            let stdoutOrMessage = stdout;
            if (stdout.length > OUTPUT_MAX_LENGTH) {
              if (["cat", "head", "tail"].includes(command)) {
                const lineCount = stdout.split("\n").length;
                stdoutOrMessage = [
                  `Content is too large (${stdout.length} characters, ${lineCount} lines).`,
                  "Use head, tail, rg, or awk to read specific parts.",
                ].join("\n");
              } else {
                const filePath = await writeTmpFile(
                  stdout,
                  `exec_command-${command.replaceAll("/", "-").replaceAll(".", "dot-")}`,
                  "txt",
                );
                const lineCount = stdout.split("\n").length;
                stdoutOrMessage = [
                  `Content is too large (${stdout.length} characters, ${lineCount} lines). Saved to ${filePath}.`,
                  "Use head, tail, rg, or awk to read specific parts.",
                ].join("\n");
              }
            }

            let stderrOrMessage = stderr;
            if (stderr.length > OUTPUT_MAX_LENGTH) {
              const filePath = await writeTmpFile(
                stderr,
                `exec_command-${command.replaceAll("/", "-").replaceAll(".", "dot-")}`,
                "txt",
              );
              const lineCount = stderr.split("\n").length;
              stderrOrMessage = [
                `Content is large (${stderr.length} characters, ${lineCount} lines) and saved to ${filePath}`,
                "Use head / tail / rg / awk to read specific parts",
              ].join("\n");
            }

            const result = [
              stdoutOrMessage
                ? `<stdout>\n${stdoutOrMessage}</stdout>`
                : "<stdout></stdout>",
              "",
              stderrOrMessage
                ? `<stderr>\n${stderrOrMessage}</stderr>`
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
