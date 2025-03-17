import type { AgentEventEmitter, UserEventEmitter } from "./agent";

export type CliOptions = {
  userEventEmitter: UserEventEmitter;
  agentEventEmitter: AgentEventEmitter;
  sessionId: string;
  modelName: string;
};
