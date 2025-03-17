import type { ToolDefinition } from "./tool";

export type CallModel = (input: ModelInput) => Promise<ModelOutput | Error>;

export type ModelOutput = {
  message: Message;
  providerTokenUsage: ProviderTokenUsage;
};
export type ProviderTokenUsage = Record<
  string,
  number | Record<string, number>
>;

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
  content: (
    | MessageContentThinking
    | MessageContentText
    | MessageContentToolUse
  )[];
};

export type MessageContentThinking = {
  type: "thinking";
  thinking: string;
  providerMetadata?: Record<string, unknown>;
};

export type MessageContentText = {
  type: "text";
  text: string;
};

export type MessageContentToolUse = {
  type: "tool_use";
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
};

export type MessageContentToolResult = {
  type: "tool_result";
  toolUseId: string;
  toolName: string;
  content: string;
  isError?: boolean;
};
