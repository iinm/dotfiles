import { execFile } from "node:child_process";

import { tool } from "@langchain/core/tools";

import z from "zod";

const OUTPUT_MAX_LENGTH = 10_000;

export const execCommandTool = tool(
  async (input) => {
    const { command, args } = input;
    return new Promise((resolve, reject) => {
      execFile(command, args, { timeout: 20 * 1000 }, (err, stdout, stderr) => {
        const stdoutTruncated = stdout.slice(0, OUTPUT_MAX_LENGTH);
        const isStdoutTruncated = stdout.length > OUTPUT_MAX_LENGTH;
        const stderrTruncated = stderr.slice(0, OUTPUT_MAX_LENGTH);
        const isStderrTruncated = stderr.length > OUTPUT_MAX_LENGTH;
        const result = [
          `<stdout truncated="${isStdoutTruncated}">
${stdoutTruncated}</stdout>`,
          `<stderr truncated="${isStderrTruncated}">
${stderrTruncated}</stderr>`,
        ];
        if (err) {
          const errMessageTruncated = err.message.slice(0, OUTPUT_MAX_LENGTH);
          const isErrMessageTruncated = err.message.length > OUTPUT_MAX_LENGTH;
          result.push(
            `<error truncated="${isErrMessageTruncated}">
${err.name}: ${errMessageTruncated}</error>`,
          );
          return reject(new Error(result.join("\n")));
        }
        return resolve(result.join("\n"));
      });
    });
  },
  {
    name: "exec_command",
    description: "Run a command without shell interpretation.",
    schema: z.object({
      command: z.string().describe("The command to run."),
      args: z
        .array(z.string())
        .optional()
        .describe("Arguments for the command."),
    }),
  },
);
