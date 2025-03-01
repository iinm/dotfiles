import { execFile } from "node:child_process";

import { tool } from "@langchain/core/tools";

import z from "zod";

const OUTPUT_MAX_LENGTH = 10_000;

export const tmuxTool = tool(
  async (input) => {
    const { command } = input;
    // tmuxはセミコロンを複数コマンドの区切りとして扱うためエスケープが必要
    // LLMがこのルールを無視するのでここでエスケープする
    if (command.at(0) === "send-keys") {
      for (let i = 1; i < command.length; i++) {
        const arg = command[i];
        if (arg.endsWith(";") && !arg.endsWith("\\;")) {
          command[i] = arg.slice(0, -1) + "\\;";
        }
      }
    }
    return new Promise((resolve, reject) => {
      execFile("tmux", command, async (err, stdout, stderr) => {
        // capture-pane の結果に空白の行が含まれることがあるためtrim する
        const stdoutTruncated = stdout.slice(0, OUTPUT_MAX_LENGTH).trim();
        const isStdoutTruncated = stdout.length > OUTPUT_MAX_LENGTH;
        const stderrTruncated = stderr.slice(0, OUTPUT_MAX_LENGTH).trim();
        const isStderrTruncated = stderr.length > OUTPUT_MAX_LENGTH;
        const result = [
          stdoutTruncated
            ? `<stdout truncated="${isStdoutTruncated}">\n${stdoutTruncated}\n</stdout>`
            : `<stdout truncated="false"></stdout>`,
          "",
          stderrTruncated
            ? `<stderr truncated="${isStderrTruncated}">\n${stderrTruncated}\n</stderr>`
            : `<stderr truncated="false"></stderr>`,
        ];
        if (err) {
          const errMessageTruncated = err.message.slice(0, OUTPUT_MAX_LENGTH);
          const isErrMessageTruncated = err.message.length > OUTPUT_MAX_LENGTH;
          result.push(
            `\n<error truncated="${isErrMessageTruncated}">\n${err.name}: ${errMessageTruncated}</error>`,
          );
          return reject(new Error(result.join("\n")));
        }

        if (
          ["new-session", "new", "new-window"].includes(command.at(0) || "")
        ) {
          // show window list after creating a new session or window
          const targetPosition = command?.at(0)?.includes("window")
            ? command.indexOf("-t") + 1
            : command.indexOf("-s") + 1;
          const target = command[targetPosition];
          const listWindowResult = await new Promise((resolve, _reject) => {
            execFile(
              "tmux",
              ["list-windows", "-t", target],
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

        if (command.at(0) === "send-keys") {
          // capture the pane after sending keys
          // wait for the command to be executed
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const targetPosition = command.indexOf("-t") + 1;
          const target = command[targetPosition];
          const captured: string = await new Promise((resolve, _reject) => {
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
          const capturedTruncated = captured.slice(-OUTPUT_MAX_LENGTH);
          const isCapturedTruncated = captured.length > OUTPUT_MAX_LENGTH;
          result.push(
            `\n<tmux:capture-pane target="${target}" trucated="${isCapturedTruncated}">\n${capturedTruncated}</tmux:capture-pane>`,
          );
        }

        return resolve(result.join("\n"));
      });
    });
  },
  {
    name: "tmux",
    description: "Run a tmux command.",
    schema: z.object({
      command: z.array(z.string()).describe("The tmux command to run."),
    }),
  },
);
