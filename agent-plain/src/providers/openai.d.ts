export type OpenAIModelConfig = {
  model: "gpt-4o-mini" | "o3-mini";
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
};

export type OpenAIChatCompletion = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenIAChatCompletionChoice[];
  usage: OpenAIChatCompletionUsage;
};

type OpenIAChatCompletionChoice = {
  index: number;
  message: OpenAIMessage;
  finish_reason: string;
};

type OpenAIMessageStrict =
  | {
      role: "system";
      content: OpenAIMessageContentText[];
    }
  | {
      role: "user";
      content: OpenAIMessageContentText[];
    }
  | {
      role: "assistant";
      content?: OpenAIMessageContentText[];
      tool_calls?: OpenAIMessageToolCall[];
    }
  | {
      role: "tool";
      content: string | OpenAIMessageContentText[];
      tool_call_id: string;
    };

type OpenAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | OpenAIMessageContent[];
  tool_calls?: OpenAIMessageToolCall[];
  tool_call_id?: string;
};

type OpenAIMessageContent = OpenAIMessageContentText;

type OpenAIMessageContentText = {
  type: "text";
  text: string;
};

type OpenAIMessageToolCall = {
  id: string;
  type: "function";
  function: OpenAIToolCallFunction;
};

type OpenAIToolCallFunction = {
  name: string;
  arguments: string;
};

type OpenAIChatCompletionUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details: Record<string, number>;
  completion_tokens_details: Record<string, number>;
};

type OpenAIToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};
