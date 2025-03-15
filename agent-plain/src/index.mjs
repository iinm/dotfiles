/**
 * @import {ChatMessage} from "./chat"
 * @import {UserEventEmitter, AgentEventEmitter} from "./events"
 */

import { EventEmitter } from "node:events";
import { startCLI } from "./cli.mjs";
import { callAnthropicModel } from "./provider/anthropic.mjs";
import { callOpenAIModel } from "./provider/openai.mjs";

(async () => {
  /** @type {UserEventEmitter} */
  const userEventEmitter = new EventEmitter();

  /** @type {AgentEventEmitter} */
  const agentEventEmitter = new EventEmitter();

  /** @type {ChatMessage[]} */
  const messages = [];

  userEventEmitter.on("userInput", async (input) => {
    messages.push({ role: "user", content: [{ type: "text", text: input }] });

    const modelMessage = await callOpenAIModel(
      {
        model: "gpt-4o-mini",
        temperature: 0,
      },
      { messages, tools: [] },
    );

    // const modelMessage = await callAnthropicModel(
    //   {
    //     model: "claude-3-5-haiku-latest",
    //     max_tokens: 1024,
    //     temperature: 0,
    //   },
    //   { messages, tools: [] },
    // );

    if (modelMessage instanceof Error) {
      throw modelMessage;
    }

    messages.push(modelMessage);
    agentEventEmitter.emit("message", modelMessage);
  });

  startCLI(userEventEmitter, agentEventEmitter);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
