import type { ToolDefinition } from "./tool";

export type CallModel = (input: ModelInput) => Promise<ModelOutput | Error>;

export type ModelInput = {
  messages: Message[];
  tools?: ToolDefinition[];
  onPartialMessageContent?: (partialContent: PartialMessageContent) => void;
};

export type ModelOutput = {
  message: Message;
  providerTokenUsage: ProviderTokenUsage;
};

export type ProviderTokenUsage = Record<
  string,
  number | string | Record<string, number>
>;

export type PartialMessageContent = {
  type: string;
  position: "start" | "stop" | "delta";
  content?: string;
};

export type Message = SystemMessage | UserMessage | AssistantMessage;

export type SystemMessage = {
  role: "system";
  content: MessageContentText[];
};

export type UserMessage = {
  role: "user";
  content: (
    | MessageContentText
    | MessageContentImage
    | MessageContentToolResult
  )[];
};

export type AssistantMessage = {
  role: "assistant";
  content: (
    | MessageContentThinking
    | MessageContentRedactedThinking
    | MessageContentText
    | MessageContentToolUse
  )[];
  provider?: MessageContentProvider;
};

export type MessageContentThinking = {
  type: "thinking";
  thinking: string;
  provider?: MessageContentProvider;
};

export type MessageContentRedactedThinking = {
  type: "redacted_thinking";
  provider?: MessageContentProvider;
};

export type MessageContentText = {
  type: "text";
  text: string;
  provider?: MessageContentProvider;
};

export type MessageContentImage = {
  type: "image";

  // base64 encoded image data
  data: string;

  // e.g., image/jpeg
  mimeType: string;
};

export type MessageContentToolUse = {
  type: "tool_use";
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  provider?: MessageContentProvider;
};

export type MessageContentToolResult = {
  type: "tool_result";
  toolUseId: string;
  toolName: string;
  content: (MessageContentText | MessageContentImage)[];
  isError?: boolean;
};

export type MessageContentProvider = {
  /**
   * Raw source data from the provider
   * (original message, response, output items, etc.)
   */
  source?: unknown;

  /**
   * Provider-specific fields that are directly merged
   * into the content part sent to the provider API.
   */
  fields?: Record<string, unknown>;
};
