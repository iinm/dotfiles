import { exec } from "node:child_process";

import { tool } from "@langchain/core/tools";

import z from "zod";

export const shellCommandTool = tool(
  async (input) => {
    const { command } = input;
    return new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        const result = [
          `<stdout>${stdout}</stdout>`,
          `<stderr>${stderr}</stderr>`,
        ];
        if (err) {
          result.push(`<error>${err.name}: ${err.message}</error>`);
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
