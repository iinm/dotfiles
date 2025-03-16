import type { ToolDefinition } from "./tool";

export type CallModel = (input: ModelInput) => Promise<Message | Error>;

export type ModelInput = {
  messages: Message[];
  tools?: ToolDefinition[];
};

export type Message = SystemMessage | UserMessage | AssistantMessage;

export type SystemMessage = {
  role: "system";
  content: MessageContentText[];
};

export type UserMessage = {
  role: "user";
  content: (MessageContentText | MessageContentToolResult)[];
};

export type AssistantMessage = {
  role: "assistant";
  content: (MessageContentText | MessageContentToolUse)[];
};

export type MessageContent =
  | MessageContentText
  | MessageContentToolUse
  | MessageContentToolResult;

export type MessageContentText = {
  type: "text";
  text: string;
};

export type MessageContentToolUse = {
  type: "tool_use";
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
};

export type MessageContentToolResult = {
  type: "tool_result";
  toolUseId: string;
  content: string;
  isError?: boolean;
};
