/**
 * @import {AgentConfig, AgentEventEmitter, UserEventEmitter} from "./agent"
 * @import {ChatMessage} from "./chat"
 */

import { EventEmitter } from "node:events";

/**
 * @param {AgentConfig} config
 */
export function createAgent({ callModel, tools }) {
  /** @type {UserEventEmitter} */
  const userEventEmitter = new EventEmitter();
  /** @type {AgentEventEmitter} */
  const agentEventEmitter = new EventEmitter();

  /** @type {ChatMessage[]} */
  const messages = [];

  userEventEmitter.on("userInput", async (input) => {
    messages.push({ role: "user", content: [{ type: "text", text: input }] });

    const modelMessage = await callModel({ messages, tools });

    if (modelMessage instanceof Error) {
      throw modelMessage;
    }

    messages.push(modelMessage);
    agentEventEmitter.emit("message", modelMessage);
  });

  return {
    userEventEmitter,
    agentEventEmitter,
  };
}
