/**
 * @import { Tool } from '../tool'
 * @import { TmuxCommandInput } from './tmuxCommand'
 */

import { execFile } from "node:child_process";
import { noThrow } from "../utils/noThrow.mjs";

const OUTPUT_MAX_LENGTH = 1024 * 8;

/** @type {Tool} */
export const tmuxCommandTool = {
  def: {
    name: "tmux_command",
    description: "Run a tmux command",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          description: "The tmux command to run",
          type: "string",
        },
        args: {
          description: "Arguments to pass to the tmux command",
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
   * @param {TmuxCommandInput} input
   * @returns {Promise<string | Error>}
   */
  impl: async (input) =>
    await noThrow(async () => {
      const { command } = input;
      const args = input.args || [];

      const execFileOptions = {
        shell: false,
        env: {
          PWD: process.env.PWD,
          PATH: process.env.PATH,
          HOME: process.env.HOME,
        },
      };

      // tmuxはセミコロンを複数コマンドの区切りとして扱うためエスケープが必要
      // LLMがこのルールを無視するのでここでエスケープする
      if (command === "send-keys") {
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg.endsWith(";") && !arg.endsWith("\\;")) {
            args[i] = `${arg.slice(0, -1)}\\;`;
          }
        }
      }
      return new Promise((resolve, _reject) => {
        execFile(
          "tmux",
          [command, ...args],
          execFileOptions,
          async (err, stdout, stderr) => {
            // capture-pane の結果に空白の行が含まれることがあるためtrim する
            const stdoutTruncated = stdout.trim().slice(-OUTPUT_MAX_LENGTH);
            const isStdoutTruncated = stdout.trim().length > OUTPUT_MAX_LENGTH;
            const stderrTruncated = stderr.trim().slice(-OUTPUT_MAX_LENGTH);
            const isStderrTruncated = stderr.trim().length > OUTPUT_MAX_LENGTH;
            const result = [
              stdoutTruncated
                ? `<stdout>\n${isStdoutTruncated ? "(Output truncated) ..." : ""}${stdoutTruncated}\n</stdout>`
                : "<stdout></stdout>",
              "",
              stderrTruncated
                ? `<stderr>\n${isStderrTruncated ? "(Output truncated) ..." : ""}${stderrTruncated}\n</stderr>`
                : "<stderr></stderr>",
            ];
            if (err) {
              const errMessageTruncated = err.message.slice(
                0,
                OUTPUT_MAX_LENGTH,
              );
              const isErrMessageTruncated =
                err.message.length > OUTPUT_MAX_LENGTH;
              result.push(
                `\n<error>\n${err.name}: ${errMessageTruncated}${isErrMessageTruncated ? "... (Message truncated)" : ""}</error>`,
              );
            }

            if (["new-session", "new", "new-window"].includes(command)) {
              // show window list after creating a new session or window
              const targetPosition = command.includes("window")
                ? args.indexOf("-t") + 1
                : args.indexOf("-s") + 1;
              const target = args[targetPosition];
              const listWindowResult = await new Promise((resolve, _reject) => {
                execFile(
                  "tmux",
                  ["list-windows", "-t", target],
                  execFileOptions,

                  (err, stdout, _stderr) => {
                    if (err) {
                      console.error(
                        `Failed to list tmux windows: ${err.message}, stack=${err.stack}`,
                      );
                    }
                    return resolve(stdout);
                  },
                );
              });
              result.push(
                `\n<tmux:list-windows>\n${listWindowResult}</tmux:list-windows>`,
              );
            }

            if (command === "send-keys") {
              // capture the pane after sending keys
              // wait for the command to be executed
              await new Promise((resolve) => setTimeout(resolve, 2000));
              const targetPosition = args.indexOf("-t") + 1;
              const target = args[targetPosition];
              const captured = await new Promise((resolve, _reject) => {
                execFile(
                  "tmux",
                  ["capture-pane", "-p", "-t", target],
                  execFileOptions,
                  (err, stdout, _stderr) => {
                    if (err) {
                      console.error(
                        `Failed to capture tmux pane: ${err.message}, stack=${err.stack}`,
                      );
                    }
                    return resolve(stdout.trim());
                  },
                );
              });
              const capturedTruncated = captured.slice(-OUTPUT_MAX_LENGTH);
              const isCapturedTruncated = captured.length > OUTPUT_MAX_LENGTH;
              result.push(
                `\n<tmux:capture-pane target="${target}"">\n${isCapturedTruncated ? "(Output truncated) ..." : ""}${capturedTruncated}\n</tmux:capture-pane>`,
              );
            }

            return resolve(result.join("\n"));
          },
        );
      });
    }),
};
