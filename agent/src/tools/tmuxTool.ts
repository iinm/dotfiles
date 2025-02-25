import { exec } from "node:child_process";

import { tool } from "@langchain/core/tools";

import z from "zod";

export const tmuxTool = tool(
  async (input) => {
    const { command } = input;
    return new Promise((resolve, reject) => {
      exec(`tmux ${command}`, async (err, stdout, stderr) => {
        const result = [
          `<stdout>${stdout}</stdout>`,
          `<stderr>${stderr}</stderr>`,
        ];
        if (err) {
          result.push(`<error>${err.name}: ${err.message}</error>`);
          return reject(new Error(result.join("\n")));
        }
        if (command.startsWith("send-keys")) {
          // wait for the command to be executed
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const xs = command.split(" ");
          const targetPosition = xs.indexOf("-t") + 1;
          const target = xs[targetPosition];
          const captured = await new Promise((resolve, _reject) => {
            exec(
              `tmux capture-pane -p -t ${target} | grep -vE '^$' | tail -10`,
              (_err, stdout, _stderr) => {
                return resolve(stdout);
              },
            );
          });
          result.push(
            [
              `<tmux:capture-pane-result target="${target}" tail="10">`,
              captured,
              `</tmux:capture-pane-result>`,
            ].join(""),
          );
        }
        return resolve(result.join("\n"));
      });
    });
  },
  {
    name: "tmux",
    description: "Run a tmux command.".trim(),
    schema: z.object({
      command: z.string().describe("The tmux command to run.".trim()),
    }),
  },
);
