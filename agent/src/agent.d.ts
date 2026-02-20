import type { EventEmitter } from "node:events";
import type {
  CallModel,
  Message,
  MessageContentImage,
  MessageContentText,
  PartialMessageContent,
  ProviderTokenUsage,
} from "./model";
import type { Tool, ToolUseApprover } from "./tool";

export type Agent = {
  userEventEmitter: UserEventEmitter;
  agentEventEmitter: AgentEventEmitter;
  agentCommands: AgentCommands;
};

export type AgentCommands = {
  dumpMessages: () => Promise<void>;
  loadMessages: () => Promise<void>;
};

type UserEventMap = {
  userInput: [(MessageContentText | MessageContentImage)[]];
};

export type UserEventEmitter = EventEmitter<UserEventMap>;

type AgentEventMap = {
  message: [Message];
  partialMessageContent: [PartialMessageContent];
  error: [Error];
  toolUseRequest: [];
  turnEnd: [];
  providerTokenUsage: [ProviderTokenUsage];
  subagentStatus: [{ name: string } | null];
};

export type AgentEventEmitter = EventEmitter<AgentEventMap>;

export type AgentConfig = {
  callModel: CallModel;
  prompt: string;
  tools: Tool[];
  toolUseApprover: ToolUseApprover;
};
