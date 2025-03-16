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
  content: AnthropicAssistantMessage["content"];
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
  content: (AnthropicMessageContentText | AnthropicMessageContentToolCall)[];
};

export type AnthropicMessageContent =
  | AnthropicMessageContentText
  | AnthropicMessageContentToolCall
  | AnthropicMessageContentToolResult;

export type AnthropicMessageContentText = {
  type: "text";
  text: string;
};

export type AnthropicMessageContentToolCall = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AnthropicMessageContentToolResult = {
  type: "tool_result";
  tool_use_id: string;
  content: string | AnthropicMessageContentText[];
  is_error?: boolean;
};

export type AnthropicChatCompletionUsage = {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
};

export type AnthropicToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};
