/* Model */
export type OpenAIModelConfig = {
  model: string;
  reasoning: {
    effort: "minimal" | "low" | "medium" | "high";
    summary: "auto" | "concise" | "detailed";
  };
};

/**
 * Request
 * https://platform.openai.com/docs/api-reference/responses/create
 */
export type OpenAIRequest = OpenAIModelConfig & {
  input: OpenAIInputItem[];
  tools?: OpenAIToolFunction[];
  stream?: boolean;
};

/* Input */
export type OpenAIInputItem =
  | OpenAIInputMessage
  | OpenAIFunctionToolCallOutput
  | OpenAIOutputItem;

export type OpenAIInputMessage = {
  role: "user" | "system";
  content: OpenAIInputContent[];
};

export type OpenAIInputContent = OpenAIInputText | OpenAIInputImage;

export type OpenAIInputText = {
  type: "input_text";
  text: string;
};

export type OpenAIInputImage = {
  type: "input_image";
  image_url: string;
  detail?: "low" | "high" | "auto";
};

/* Tool */
export type OpenAIToolFunction = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type OpenAIFunctionToolCallOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

/* Response */
export type OpenAIResponse = {
  id: string;
  object: "response";
  output: OpenAIOutputItem[];
  usage: OpenAIUsage;
};

/* Output */
export type OpenAIOutputItem =
  | OpenAIReasoning
  | OpenAIOutputMessage
  | OpenAIFunctionToolCall;

export type OpenAIOutputMessage = {
  id: string;
  type: "message";
  role: "assistant";
  content: OpenAIOutputContent[];
  status: "in_progress" | "completed" | "incomplete";
};

export type OpenAIOutputContent = OpenAIOutputText | OpenAIOutputRefusal;

export type OpenAIOutputText = {
  type: "output_text";
  text: string;
  annotations: unknown;
};

export type OpenAIOutputRefusal = {
  type: "refusal";
  refusal: string;
};

export type OpenAIFunctionToolCall = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
  status?: "in_progress" | "completed" | "incomplete";
};

export type OpenAIReasoning = {
  id: string;
  type: "reasoning";
  summary: { type: "summary_text"; text: string };
};

export type OpenAIUsage = {
  input_tokens: number;
  input_tokens_details: {
    cached_tokens: number;
  };
  output_tokens: number;
  output_tokens_details: {
    reasoning_tokens: number;
  };
  total_tokens: number;
};

/* Streaming Data */
export type OpenAIStreamEvent =
  | OpenAIStreamEventResponseCreated
  | OpenAIStreamEventResponseInProgress
  | OpenAIStreamEventResponseCompleted
  | OpenAIStreamEventResponseFailed
  | OpenAIStreamEventResponseOutputItemAdded
  | OpenAIStreamEventResponseOutputItemDone
  | OpenAIStreamEventResponseContentPartAdded
  | OpenAIStreamEventResponseContentPartDone
  | OpenAIStreamEventResponseFunctionCallArgumentsDelta
  | OpenAIStreamEventResponseFunctionCallArgumentsDone
  | OpenAIStreamEventResponseOutputTextDelta
  | OpenAIStreamEventResponseOutputTextDone
  | OpenAIStreamEventReasoningSummaryPartAdded
  | OpenAIStreamEventReasoningSummaryPartDone
  | OpenAIStreamEventReasoningSummaryTextDelta
  | OpenAIStreamEventReasoningSummaryTextDone;

export type OpenAIStreamEventResponseCreated = {
  type: "response.created";
  sequence_number: number;
  response: unknown;
};

export type OpenAIStreamEventResponseInProgress = {
  type: "response.in_progress";
  sequence_number: number;
  response: unknown;
};

export type OpenAIStreamEventResponseCompleted = {
  type: "response.completed";
  sequence_number: number;
  response: OpenAIResponse;
};

export type OpenAIStreamEventResponseFailed = {
  type: "response.failed";
  sequence_number: number;
  response: {
    error: unknown;
  };
};

export type OpenAIStreamEventResponseOutputItemAdded = {
  type: "response.output_item.added";
  sequence_number: number;
  output_index: number;
  item: OpenAIOutputItem;
};

export type OpenAIStreamEventResponseOutputItemDone = {
  type: "response.output_item.done";
  sequence_number: number;
  output_index: number;
  item: OpenAIOutputItem;
};

export type OpenAIStreamEventResponseContentPartAdded = {
  type: "response.content_part.added";
  sequence_number: number;
  item_id: string;
  output_index: number;
  content_index: number;
  part: OpenAIOutputContent;
};

export type OpenAIStreamEventResponseContentPartDone = {
  type: "response.content_part.done";
  sequence_number: number;
  item_id: string;
  output_index: number;
  content_index: number;
  part: OpenAIOutputContent;
};

export type OpenAIStreamEventResponseFunctionCallArgumentsDelta = {
  type: "response.function_call_arguments.delta";
  sequence_number: number;
  item_id: string;
  output_index: number;
  delta: string;
  obfuscation: string;
};

export type OpenAIStreamEventResponseFunctionCallArgumentsDone = {
  type: "response.function_call_arguments.done";
  sequence_number: number;
  item_id: string;
  output_index: number;
  arguments: string;
};

export type OpenAIStreamEventResponseOutputTextDelta = {
  type: "response.output_text.delta";
  sequence_number: number;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
  logprobs: unknown[];
  obfuscation: string;
};

export type OpenAIStreamEventResponseOutputTextDone = {
  type: "response.output_text.done";
  sequence_number: number;
  item_id: string;
  output_index: number;
  content_index: number;
  text: string;
  logprobs: unknown[];
};

export type OpenAIStreamEventReasoningSummaryPartAdded = {
  type: "response.reasoning_summary_part.added";
  sequence_number: number;
  item_id: string;
  output_index: number;
  summary_index: number;
  part: {
    type: "summary_text";
    text: string;
  };
};

export type OpenAIStreamEventReasoningSummaryPartDone = {
  type: "response.reasoning_summary_part.done";
  sequence_number: number;
  item_id: string;
  output_index: number;
  summary_index: number;
  part: {
    type: "summary_text";
    text: string;
  };
};

export type OpenAIStreamEventReasoningSummaryTextDelta = {
  type: "response.reasoning_summary_text.delta";
  sequence_number: number;
  item_id: string;
  output_index: number;
  summary_index: number;
  delta: string;
};

export type OpenAIStreamEventReasoningSummaryTextDone = {
  type: "response.reasoning_summary_text.done";
  sequence_number: number;
  item_id: string;
  output_index: number;
  summary_index: number;
  text: string;
};
