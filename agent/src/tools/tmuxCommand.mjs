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
        execFile("tmux", [command, ...args], async (err, stdout, stderr) => {
          // capture-pane の結果に空白の行が含まれることがあるためtrim する
          const stdoutOmitted = stdout.trim().slice(-OUTPUT_MAX_LENGTH);
          const isStdoutOmitted = stdout.trim().length > OUTPUT_MAX_LENGTH;
          const stderrOmitted = stderr.trim().slice(-OUTPUT_MAX_LENGTH);
          const isStderrOmitted = stderr.trim().length > OUTPUT_MAX_LENGTH;
          const result = [
            stdoutOmitted
              ? `<stdout>\n${isStdoutOmitted ? "(Output omitted) ..." : ""}${stdoutOmitted}\n</stdout>`
              : "<stdout></stdout>",
            "",
            stderrOmitted
              ? `<stderr>\n${isStderrOmitted ? "(Output omitted) ..." : ""}${stderrOmitted}\n</stderr>`
              : "<stderr></stderr>",
          ];
          if (err) {
            const errMessageOmitted = err.message.slice(0, OUTPUT_MAX_LENGTH);
            const isErrMessageOmitted = err.message.length > OUTPUT_MAX_LENGTH;
            result.push(
              `\n<error>\n${err.name}: ${errMessageOmitted}${isErrMessageOmitted ? "... (Message omitted)" : ""}</error>`,
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
                {
                  shell: false,
                  env: {},
                },
                (err, stdout, _stderr) => {
                  if (err) {
                    console.error(
                      `Failed to list windows: ${err.message}, stack=${err.stack}`,
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
                (err, stdout, _stderr) => {
                  if (err) {
                    console.error(
                      `Failed to capture pane: ${err.message}, stack=${err.stack}`,
                    );
                  }
                  return resolve(stdout.trim());
                },
              );
            });
            const capturedOmitted = captured.slice(-OUTPUT_MAX_LENGTH);
            const isCapturedOmitted = captured.length > OUTPUT_MAX_LENGTH;
            result.push(
              `\n<tmux:capture-pane target="${target}"">\n${isCapturedOmitted ? "(Output omitted) ..." : ""}${capturedOmitted}\n</tmux:capture-pane>`,
            );
          }

          return resolve(result.join("\n"));
        });
      });
    }),
};
