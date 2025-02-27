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
        const stdoutTruncated = stdout.slice(0, OUTPUT_MAX_LENGTH);
        const isStdoutTruncated = stdout.length > OUTPUT_MAX_LENGTH;
        const stderrTruncated = stderr.slice(0, OUTPUT_MAX_LENGTH);
        const isStderrTruncated = stderr.length > OUTPUT_MAX_LENGTH;
        const result = [
          `<stdout truncated="${isStdoutTruncated}">\n${stdoutTruncated}</stdout>`,
          `<stderr truncated="${isStderrTruncated}">\n${stderrTruncated}</stderr>`,
        ];
        if (err) {
          const errMessageTruncated = err.message.slice(0, OUTPUT_MAX_LENGTH);
          const isErrMessageTruncated = err.message.length > OUTPUT_MAX_LENGTH;
          result.push(
            `<error truncated="${isErrMessageTruncated}">\n${err.name}: ${errMessageTruncated}</error>`,
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
