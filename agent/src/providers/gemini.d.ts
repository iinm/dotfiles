/* Model */
export type GeminiModelConfig = {
  // https://ai.google.dev/gemini-api/docs/models
  model: "gemini-2.5-pro" | "gemini-2.5-flash";
  requestConfig?: {
    generationConfig: GeminiGenerationConfig;
    safetySettings?: GeminiSafetySetting[];
  };
};

// https://ai.google.dev/api/generate-content
export type GeminiGenerationConfig = {
  temperature: number;
  maxOutputTokens?: number;
  thinkingConfig?: {
    includeThoughts: boolean;
    thinkingBudget?: number;
  };
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
  cachedContent?: string;
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
  role: "user";
  parts: GeminiContentPartFunctionResponse[];
};

/* Content Parts */
export type GeminiContentPartText = {
  text: string;
  thoughtSignature?: string;
  thought?: boolean;
};

export type GeminiContentPartFunctionCall = {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
  };
  thoughtSignature?: string;
};

export type GeminiContentPartFunctionResponse = {
  functionResponse: {
    name: string;
    response: {
      name: string;
      content: (GeminiContentPartText | GeminiContentPartInlineData)[];
    };
  };
};

export type GeminiContentPartInlineData = {
  inline_data: {
    mime_type: string;
    data: string;
  };
};

/**
 * Tool
 * ref. https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1beta1/FunctionDeclaration
 */
export type GeminiToolDefinition = {
  functionDeclarations: {
    name: string;
    description: string;
    parametersJsonSchema: Record<string, unknown>;
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
  totalTokenCount: number;
  promptTokenCount: number;
  cachedContentTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  promptTokensDetails: GeminiTokensDetail[];
  cachedTokenDetails?: GeminiTokensDetail[];
};

/* Caching */
export type GeminiCreateCachedContentInput = {
  model: string;

  /**
   * e.g., 600s
   */
  ttl: string;

  system_instruction?: {
    parts: GeminiContentPartText[];
  };
  contents: (GeminiUserContent | GeminiModelContent | GeminiFunctionContent)[];
  tools?: GeminiToolDefinition[];
};

export type GeminiCachedContents = {
  contents: unknown[];
  tools: unknown[];
  createTime: string;
  updateTime: string;
  usageMetadata: GeminiUsageMetadata;
  expireTime: string;
  ttl: string;
  name: string;
  displayName: string;
  model: string;
  systemInstruction: unknown;
  toolConfig: unknown;
};
