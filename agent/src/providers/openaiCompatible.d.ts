/* Model */
export type OpenAIModelConfig =
  | {
      model: string;
      temperature?: number;
    }
  | {
      model: string;
      reasoning_effort?: "low" | "medium" | "high";
    };

/* Request */
export type OpenAIChatCompletionRequest = {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAIToolDefinition[];
  stream?: boolean;
  temperature?: number;
  reasoning_effort?: "low" | "medium" | "high";
  stream_options?: {
    include_usage: boolean;
  };
};

/* Output */
export type OpenAIChatCompletion = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenIAChatCompletionChoice[];
  usage: OpenAIChatCompletionUsage;
};

export type OpenIAChatCompletionChoice = {
  index: number;
  message: OpenAIAssistantMessage;
  finish_reason: string;
};

/* Message */
export type OpenAIMessage =
  | OpenAISystemMessage
  | OpenAIUserMessage
  | OpenAIAssistantMessage
  | OpenAIToolMessage;

export type OpenAISystemMessage = {
  role: "system";
  content: OpenAIMessageContentText[];
};

export type OpenAIUserMessage = {
  role: "user";
  content: (OpenAIMessageContentText | OpenAIMessageContentImage)[];
};

export type OpenAIAssistantMessage = {
  role: "assistant";
  reasoning_content?: string;
  content?: string;
  tool_calls?: OpenAIMessageToolCall[];
};

export type OpenAIToolMessage = {
  role: "tool";
  content: string;
  tool_call_id: string;
};

export type OpenAIMessageContentText = {
  type: "text";
  text: string;
};

export type OpenAIMessageContentImage = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

export type OpenAIMessageToolCall = {
  id: string;
  type: "function";
  function: OpenAIToolCallFunction;
};

export type OpenAIToolCallFunction = {
  name: string;
  arguments: string;
};

/* Usage */
export type OpenAIChatCompletionUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details: Record<string, number>;
  completion_tokens_details: Record<string, number>;
};

/* Tool */
export type OpenAIToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/* Streaming Data */
export type OpenAIStreamData = {
  id: string;
  object: string;
  created: number;
  model: string;
  service_tier?: string;
  system_fingerprint?: string;
  choices: OpenAIStreamDataChoice[];
  usage?: OpenAIChatCompletionUsage;
};

export type OpenAIStreamDataChoice = {
  index: number;
  delta: OpenAIStreamDataDelta;
  finish_reason: string;
};

export type OpenAIStreamDataDelta = {
  role?: "assistant";
  reasoning_content?: string;
  content?: string;
  refusal?: unknown;
  tool_calls?: OpenAIStreamDataToolCall[];
};

export type OpenAIStreamDataToolCall = {
  index: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments: string;
  };
};
