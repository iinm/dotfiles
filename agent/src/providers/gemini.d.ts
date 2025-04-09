/* Model */
export type GeminiModelConfig = {
  // https://ai.google.dev/gemini-api/docs/models?hl=ja#gemini-2.5-pro-preview-03-25
  model:
  // 有料
  | "gemini-2.5-pro-exp-03-25"
  // 試験運用版
  | "gemini-2.5-pro-preview-03-25"
  ;
  requestConfig?: {
    generationConfig: GeminiGenerationConfig;
    safetySettings: GeminiSafetySetting[];
  };
};

export type GeminiGenerationConfig = {
  temperature: number;
};

export type GeminiSafetySetting = {
  /**
   * - HARM_CATEGORY_SEXUALLY_EXPLICIT
   * - HARM_CATEGORY_HATE_SPEECH
   * - HARM_CATEGORY_HARASSMENT
   * - HARM_CATEGORY_DANGEROUS_CONTENT
   */
  category: string;

  /**
   * - BLOCK_NONE
   * ...
   */
  threshold: string;
};

/* Input */
export type GeminiGenerateContentInput = {
  generationConfig: GeminiGenerationConfig;
  safetySettings: GeminiSafetySetting[];
  system_instruction?: {
    parts: GeminiContentPartText[];
  };
  contents: (GeminiUserContent | GeminiModelContent | GeminiFunctionContent)[];
  tools?: GeminiToolDefinition[];
};

/* Content */
export type GeminiContent =
  | GeminiSystemContent
  | GeminiModelContent
  | GeminiUserContent
  | GeminiFunctionContent;

export type GeminiSystemContent = {
  role: "system";
  parts: GeminiContentPartText[];
};

export type GeminiModelContent = {
  role: "model";
  parts?: (GeminiContentPartText | GeminiContentPartFunctionCall)[];
};

export type GeminiUserContent = {
  role: "user";
  parts: GeminiContentPartText[];
};

export type GeminiFunctionContent = {
  role: "function";
  parts: GeminiContentPartFunctionResponse[];
};

/* Content Parts */
export type GeminiContentPartText = {
  text: string;
};

export type GeminiContentPartFunctionCall = {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
  };
};

export type GeminiContentPartFunctionResponse = {
  functionResponse: {
    name: string;
    response: {
      name: string;
      content: unknown;
    };
  };
};

/* Tool */
export type GeminiToolDefinition = {
  functionDeclarations: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }[];
};

/* Output */
export type GeminiGeneratedContent = {
  candidates?: GeminiGeneratedContentCandidate[];
  usageMetadata: GeminiUsageMetadata;
  modelVersion: string;
};

export type GeminiGeneratedContentCandidate = {
  content: GeminiModelContent;
  /**
   * - STOP
   * ...
   */
  finishReason?: string;
  safetyRatings: GeminiSafetyRating[];
};

export type GeminiSafetyRating = {
  category: string;
  probability: string;
};

export type GeminiTokensDetail = {
  /**
   * - TEXT
   */
  modality: string;
  tokenCount: number;
};

export type GeminiUsageMetadata = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  promptTokensDetails: GeminiTokensDetail[];
};
