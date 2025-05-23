import type { EventEmitter } from "node:events";
import type {
  CallModel,
  Message,
  PartialMessageContent,
  ProviderTokenUsage,
} from "./model";
import type { Tool, ToolUseApprover } from "./tool";

type UserEventMap = {
  userInput: [string];
};

export type UserEventEmitter = EventEmitter<UserEventMap>;

type AgentEventMap = {
  message: [Message];
  partialMessageContent: [PartialMessageContent];
  error: [Error];
  toolUseRequest: [];
  turnEnd: [];
  providerTokenUsage: [ProviderTokenUsage];
};

export type AgentEventEmitter = EventEmitter<AgentEventMap>;

export type AgentConfig = {
  callModel: CallModel;
  prompt: string;
  tools: Tool[];
  toolUseApprover: ToolUseApprover;
};
