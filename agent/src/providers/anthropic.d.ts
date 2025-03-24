export type AnthropicModelConfig = {
  model: "claude-3-5-haiku-latest" | "claude-3-7-sonnet-latest";
  max_tokens: number;

  temperature?: number;

  // thinking model options
  thinking?: {
    type: "enabled";
    budget_tokens: number;
  };
};

export type AnthropicChatCompletion = {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: AnthropicAssistantMessageContent[];
  stop_reason: string;
  usage: AnthropicChatCompletionUsage;
};

export type AnthropicMessage =
  | AnthropicSystemMessage
  | AnthropicUserMessage
  | AnthropicAssistantMessage;

export type AnthropicSystemMessage = {
  role: "system";
  content: AnthropicMessageContentText[];
};

export type AnthropicUserMessage = {
  role: "user";
  content: (AnthropicMessageContentText | AnthropicMessageContentToolResult)[];
};

export type AnthropicAssistantMessage = {
  role: "assistant";
  content: (
    | AnthropicMessageContentThinking
    | AnthropicMessageContentText
    | AnthropicMessageContentToolCall
  )[];
};

export type AnthropicAssistantMessageContent =
  | AnthropicMessageContentThinking
  | AnthropicMessageContentText
  | AnthropicMessageContentToolCall;

export type AnthropicMessageContentThinking = {
  type: "thinking";
  thinking: string;
  signature: string;
  cache_control?: { type: "ephemeral" };
};

export type AnthropicMessageContentText = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

export type AnthropicMessageContentToolCall = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
  cache_control?: { type: "ephemeral" };
};

export type AnthropicMessageContentToolResult = {
  type: "tool_result";
  tool_use_id: string;
  content: AnthropicMessageContentText[];
  is_error?: boolean;
  cache_control?: { type: "ephemeral" };
};

export type AnthropicChatCompletionUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type AnthropicToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

/* Streaming Event */
export type AnthropicStreamEvent =
  | AnthropicStreamEventMessageStart
  | AnthropicStreamEventContentBlockStart
  | AnthropicStreamEventPing
  | AnthropicStreamEventContentBlockDelta
  | AnthropicStreamEventContentBlockStop
  | AnthropicStreamEventMessageDelta
  | AnthropicStreamEventMessageStop;

export type AnthropicStreamEventMessageStart = {
  type: "message_start";
  message: AnthropicStreamEventMessage;
};

export type AnthropicStreamEventMessage = {
  id: string;
  type: "message";
  role: "assistant";
  content: unknown[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: AnthropicStreamEventUsage;
};

export type AnthropicStreamEventUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type AnthropicStreamEventContentBlockStart = {
  type: "content_block_start";
  index: number;
  content_block: AnthropicStreamEventContentBlock;
};

export type AnthropicStreamEventContentBlock =
  | AnthropicStreamEventContentBlockText
  | AnthropicStreamEventContentBlockToolUse
  | AnthropicStreamEventContentBlockThinking;

export type AnthropicStreamEventContentBlockText = {
  type: "text";
  text: string;
};

export type AnthropicStreamEventContentBlockToolUse = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AnthropicStreamEventContentBlockThinking = {
  type: "thinking";
  thinking: string;
};

export type AnthropicStreamEventPing = {
  type: "ping";
};

export type AnthropicStreamEventContentBlockDelta = {
  type: "content_block_delta";
  index: number;
  delta: AnthropicStreamEventDelta;
};

export type AnthropicStreamEventDelta =
  | AnthropicStreamEventDeltaText
  | AnthropicStreamEventDeltaInputJson
  | AnthropicStreamEventDeltaThinking
  | AnthropicStreamEventDeltaSignature;

export type AnthropicStreamEventDeltaText = {
  type: "text_delta";
  text: string;
};

export type AnthropicStreamEventDeltaInputJson = {
  type: "input_json_delta";
  partial_json: string;
};

export type AnthropicStreamEventDeltaThinking = {
  type: "thinking_delta";
  thinking: string;
};

export type AnthropicStreamEventDeltaSignature = {
  type: "signature_delta";
  signature: string;
};

export type AnthropicStreamEventContentBlockStop = {
  type: "content_block_stop";
  index: number;
};

export type AnthropicStreamEventMessageDelta = {
  type: "message_delta";
  delta: {
    stop_reason: string | null;
    stop_sequence: string | null;
  };
  usage?: {
    output_tokens: number;
  };
};

export type AnthropicStreamEventMessageStop = {
  type: "message_stop";
};
