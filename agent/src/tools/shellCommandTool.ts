import { exec } from "node:child_process";

import { tool } from "@langchain/core/tools";

import z from "zod";

const OUTPUT_MAX_LENGTH = 10_000;

/**
 * コマンドの安全性チェックが難しいので使わない
 */
export const shellCommandTool = tool(
  async (input) => {
    const { command } = input;
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 20 * 1000 }, (err, stdout, stderr) => {
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
            : `<stdout></stdout>`,
          "",
          stderrOmitted
            ? `<stderr>\n${isStderrOmitted ? "(Output omitted) ..." : ""}${stderrOmitted}</stderr>`
            : `<stderr></stderr>`,
        ];
        if (err) {
          // err.message が長過ぎる場合は先頭を表示
          const errMessageOmitted = err.message.slice(0, OUTPUT_MAX_LENGTH);
          const isErrMessageOmitted = err.message.length > OUTPUT_MAX_LENGTH;
          result.push(
            `\n<error>\n${err.name}: ${errMessageOmitted}${isErrMessageOmitted ? "... (Message omitted)" : ""}</error>`,
          );
          return reject(new Error(result.join("\n")));
        }
        return resolve(result.join("\n"));
      });
    });
  },
  {
    name: "shell_command",
    description: "Run a shell command.",
    schema: z.object({
      command: z.string().describe("The shell command to run."),
    }),
  },
);
