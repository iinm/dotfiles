import { exec } from "node:child_process";

import { tool } from "@langchain/core/tools";

import z from "zod";

const OUTPUT_MAX_LENGTH = 10_000;

export const tmuxTool = tool(
  async (input) => {
    const { command } = input;
    return new Promise((resolve, reject) => {
      exec(`tmux ${command}`, async (err, stdout, stderr) => {
        const stdoutTruncated = stdout.slice(0, OUTPUT_MAX_LENGTH);
        const isStdoutTruncated = stdout.length > OUTPUT_MAX_LENGTH;
        const stderrTruncated = stderr.slice(0, OUTPUT_MAX_LENGTH);
        const isStderrTruncated = stderr.length > OUTPUT_MAX_LENGTH;
        const result = [
          `<stdout truncated="${isStdoutTruncated}">${stdoutTruncated}</stdout>`,
          `<stderr truncated="${isStderrTruncated}">${stderrTruncated}</stderr>`,
        ];
        if (err) {
          const errMessageTruncated = err.message.slice(0, OUTPUT_MAX_LENGTH);
          const isErrMessageTruncated = err.message.length > OUTPUT_MAX_LENGTH;
          result.push(
            `<error truncated="${isErrMessageTruncated}">${err.name}: ${errMessageTruncated}</error>`,
          );
          return reject(new Error(result.join("\n")));
        }

        if (command.startsWith("send-keys")) {
          // wait for the command to be executed
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const xs = command.split(" ");
          const targetPosition = xs.indexOf("-t") + 1;
          const target = xs[targetPosition];
          const captured: string = await new Promise((resolve, _reject) => {
            exec(
              `tmux capture-pane -p -t ${target} | grep -vE '^$' | tail -10`,
              (_err, stdout, _stderr) => {
                return resolve(stdout);
              },
            );
          });
          const capturedTruncated = captured.slice(0, OUTPUT_MAX_LENGTH);
          const isCapturedTruncated = captured.length > OUTPUT_MAX_LENGTH;
          result.push(
            [
              `<tmux:capture-pane-result target="${target}" tail="10" trucated="${isCapturedTruncated}">`,
              capturedTruncated,
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
