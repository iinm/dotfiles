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
    const inputTrimmed = input.trim();
    if (inputTrimmed.length === 0) {
      cli.prompt();
      return;
    }

    userEventEmitter.emit("userInput", inputTrimmed);
    cli.pause();
  });

  agentEventEmitter.on("message", (message) => {
    console.log(JSON.stringify(message, null, 2));
  });

  agentEventEmitter.on("toolUseRequest", () => {
    console.log("Tool use requested:");
  });

  agentEventEmitter.on("turnEnd", () => {
    cli.resume();
    cli.prompt();
  });

  cli.prompt();
}
