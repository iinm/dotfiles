import type { EventEmitter } from "node:events";
import type {
  CallModel,
  Message,
  PartialMessageContent,
  ProviderTokenUsage,
} from "./model";
import type { Tool, ToolUseApprover, ToolUseRewriteRule } from "./tool";

export type Agent = {
  userEventEmitter: UserEventEmitter;
  agentEventEmitter: AgentEventEmitter;
  agentCommands: AgentCommands;
};

export type AgentCommands = {
  clearMessages: () => void;
  dumpMessages: () => Promise<void>;
  loadMessages: () => Promise<void>;
};

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
  toolUseRewriteRules: ToolUseRewriteRule[];
};
