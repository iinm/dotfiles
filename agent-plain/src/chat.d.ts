import type { ToolDefinition } from "./tool";

export type CallModel = (input: ModelInput) => Promise<ChatMessage | Error>;

export type ModelInput = {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
};

// TODO: token usage
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: ChatMessageContent[];
};

export type ChatMessageContent =
  | ChatMessageText
  | ChatMessageToolUse
  | ChatMessageToolResult;

type ChatMessageText = {
  type: "text";
  text: string;
};

type ChatMessageToolUse = {
  type: "tool_use";
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
};

type ChatMessageToolResult = {
  type: "tool_result";
  toolUseId: string;
  content: string;
  isError?: boolean;
};
