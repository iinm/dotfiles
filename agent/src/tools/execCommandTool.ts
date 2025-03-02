import { execFile } from "node:child_process";
import { styleText } from "node:util";

import { tool } from "@langchain/core/tools";

import z from "zod";

const OUTPUT_MAX_LENGTH = 10_000;

export const execCommandTool = tool(
  async (input) => {
    const { command, args } = input;
    return new Promise((resolve, reject) => {
      execFile(command, args, { timeout: 20 * 1000 }, (err, stdout, stderr) => {
        if (
          ["ls", "cat", "head", "tail", "sed", "find", "fd", "rg"].includes(
            command,
          ) &&
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

export const execCommandToolOutputUserPrinter = (output: string) => {
  const omittedOutput = output.match(/<command>(cat|head|tail|sed)<\/command>/)
    ? "<stdout>(Output omitted)</stdout>"
    : output;
  return omittedOutput
    .replace(/(<stdout>|<\/stdout>)/g, styleText("blue", "$1"))
    .replace(/(<stderr>|<\/stderr>)/g, styleText("yellow", "$1"))
    .replace(/(<error>|<\/error>)/g, styleText("red", "$1"));
};
