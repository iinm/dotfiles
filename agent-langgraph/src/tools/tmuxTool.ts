import { execFile } from "node:child_process";
import { styleText } from "node:util";

import { tool } from "@langchain/core/tools";

import z from "zod";

const OUTPUT_MAX_LENGTH = 1024 * 8;

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
    return new Promise((resolve, _reject) => {
      execFile("tmux", command, async (err, stdout, stderr) => {
        // capture-pane の結果に空白の行が含まれることがあるためtrim する
        const stdoutOmitted = stdout.trim().slice(-OUTPUT_MAX_LENGTH);
        const isStdoutOmitted = stdout.trim().length > OUTPUT_MAX_LENGTH;
        const stderrOmitted = stderr.trim().slice(-OUTPUT_MAX_LENGTH);
        const isStderrOmitted = stderr.trim().length > OUTPUT_MAX_LENGTH;
        const result = [
          stdoutOmitted
            ? `<stdout>\n${isStdoutOmitted ? "(Output omitted) ..." : ""}${stdoutOmitted}\n</stdout>`
            : `<stdout></stdout>`,
          "",
          stderrOmitted
            ? `<stderr>\n${isStderrOmitted ? "(Output omitted) ..." : ""}${stderrOmitted}\n</stderr>`
            : `<stderr></stderr>`,
        ];
        if (err) {
          const errMessageOmitted = err.message.slice(0, OUTPUT_MAX_LENGTH);
          const isErrMessageOmitted = err.message.length > OUTPUT_MAX_LENGTH;
          result.push(
            `\n<error>\n${err.name}: ${errMessageOmitted}${isErrMessageOmitted ? "... (Message omitted)" : ""}</error>`,
          );
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
          const capturedOmitted = captured.slice(-OUTPUT_MAX_LENGTH);
          const isCapturedOmitted = captured.length > OUTPUT_MAX_LENGTH;
          result.push(
            `\n<tmux:capture-pane target="${target}"">\n${isCapturedOmitted ? "(Output omitted) ..." : ""}${capturedOmitted}\n</tmux:capture-pane>`,
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

export const tmuxToolOutputUserPrinter = (output: string) => {
  return output
    .replace(/(^<stdout>|<\/stdout>$)/gm, styleText("blue", "$1"))
    .replace(/(^<stderr>|<\/stderr>$)/gm, styleText("magenta", "$1"))
    .replace(/(^<error>|<\/error>$)/gm, styleText("red", "$1"))
    .replace(/(^<tmux.*?>|<\/tmux:.*?>$)/gm, styleText("green", "$1"));
};

export const tmuxToolArgsUserPrinter = (
  args: z.infer<typeof tmuxTool.schema>,
) => {
  return JSON.stringify(args.command);
};
