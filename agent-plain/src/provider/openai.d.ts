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
  message: OpenAIChatMessage;
  finish_reason: string;
};

type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content?: string | OpenAIChatMessageContent[];
  tool_calls?: OpenAIChatToolCall[];
};

type OpenAIChatMessageContent = OpenAIChatMessageText;

type OpenAIChatMessageText = {
  type: "text";
  text: string;
};

type OpenAIChatToolCall = {
  id: string;
  type: "function";
  function: OpenAIChatToolCallFunction;
};

type OpenAIChatToolCallFunction = {
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

type OpenAIChatTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};
