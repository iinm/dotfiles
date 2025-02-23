import { exec } from "node:child_process";

import { tool } from "@langchain/core/tools";

import z from "zod";

// TODO: 起動時に専用のセッションを作成。終了時にセッションを削除するか確認する。
export const tmuxTool = tool(
  async (input) => {
    const { command } = input;
    return new Promise((resolve, reject) => {
      exec(`tmux ${command}`, (err, stdout, stderr) => {
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
    name: "tmux",
    description: "Run tmux command",
    schema: z.object({
      command: z.string().describe("The tmux command to run."),
    }),
  },
);
