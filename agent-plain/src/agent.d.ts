import type { EventEmitter } from "node:events";
import type { CallModel, Message } from "./model";
import type { Tool } from "./tool";

type UserEventMap = {
  userInput: [string];
};

export type UserEventEmitter = EventEmitter<UserEventMap>;

type AgentEventMap = {
  message: [Message];
};

export type AgentEventEmitter = EventEmitter<AgentEventMap>;

export type AgentConfig = {
  callModel: CallModel;
  tools: Tool[];
};
