/**
 * @import { CliOptions } from "./cli"
 */

import readline from "node:readline";
import { styleText } from "node:util";

/**
 * @param {CliOptions} options
 */
export function startCLI({ userEventEmitter, agentEventEmitter }) {
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${styleText(
      ["white", "bgGray"],
      `\nThread: FIXME, Model: FIXME, Commands: "resume work", "save memory", "bye"`,
    )}\n> `,
  });

  cli.on("line", async (input) => {
    userEventEmitter.emit("userInput", input);
    cli.pause();
  });

  agentEventEmitter.on("message", (message) => {
    console.log(JSON.stringify(message, null, 2));
    cli.resume();
    cli.prompt();
  });

  cli.prompt();
}
