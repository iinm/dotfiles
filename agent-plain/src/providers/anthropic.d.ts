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
  content: (AnthropicChatMessageText | AnthropicChatToolCall)[];
  stop_reason: string;
  usage: AnthropicChatCompletionUsage;
};

export type AnthropicChatMessageStrict =
  | {
      role: "system";
      content: AnthropicChatMessageText[];
    }
  | {
      role: "user";
      content: (AnthropicChatMessageText | AnthropicChatToolResult)[];
    }
  | {
      role: "assistant";
      content: (AnthropicChatMessageText | AnthropicChatToolCall)[];
    };

export type AnthropicChatMessage = {
  role: "system" | "user" | "assistant";
  content: AnthropicChatMessageContent[];
};

export type AnthropicChatMessageContent =
  | AnthropicChatMessageText
  | AnthropicChatToolCall
  | AnthropicChatToolResult;

export type AnthropicChatMessageText = {
  type: "text";
  text: string;
};

export type AnthropicChatToolCall = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AnthropicChatToolResult = {
  type: "tool_result";
  tool_use_id: string;
  content: string | AnthropicChatMessageText[];
  is_error?: boolean;
};

export type AnthropicChatCompletionUsage = {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
};

export type AnthropicChatTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};
