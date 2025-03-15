import type { EventEmitter } from "node:events";
import type { CallModel, ChatMessage, Tool } from "./chat";

type UserEventMap = {
  userInput: [string];
};

export type UserEventEmitter = EventEmitter<UserEventMap>;

type AgentEventMap = {
  message: [ChatMessage];
};

export type AgentEventEmitter = EventEmitter<AgentEventMap>;

export type AgentConfig = {
  callModel: CallModel;
  tools: Tool[];
};
