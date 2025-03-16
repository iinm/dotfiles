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
  content: (AnthropicMessageContentText | AnthropicMessageContentToolCall)[];
  stop_reason: string;
  usage: AnthropicChatCompletionUsage;
};

export type AnthropicMessageStrict =
  | {
      role: "system";
      content: AnthropicMessageContentText[];
    }
  | {
      role: "user";
      content: (
        | AnthropicMessageContentText
        | AnthropicMessageContentToolResult
      )[];
    }
  | {
      role: "assistant";
      content: (
        | AnthropicMessageContentText
        | AnthropicMessageContentToolCall
      )[];
    };

export type AnthropicChatMessage = {
  role: "system" | "user" | "assistant";
  content: AnthropicMessageContent[];
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
