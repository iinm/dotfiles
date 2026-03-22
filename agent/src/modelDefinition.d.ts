import { AnthropicModelConfig } from "./providers/anthropic";
import { GeminiModelConfig } from "./providers/gemini";
import { OpenAIModelConfig } from "./providers/openai";
import { OpenAICompatibleModelConfig } from "./providers/openaiCompatible";

export type ModelDefinition = {
  name: string;
  variant: string;
  platform: PlatformConfig;
  model: ModelConfig;
};

export type PlatformConfig =
  | {
      name: "anthropic";
      variant: string;
      baseURL: string;
      customHeaders?: Record<string, string>;
      apiKey: string;
    }
  | {
      name: "gemini";
      variant: string;
      baseURL: string;
      customHeaders?: Record<string, string>;
      apiKey: string;
    }
  | {
      name: "openai";
      variant: string;
      baseURL: string;
      customHeaders?: Record<string, string>;
      apiKey: string;
    }
  | {
      name: "azure";
      variant: string;
      baseURL: string;
      customHeaders?: Record<string, string>;
      azureConfigDir?: string;
    }
  | {
      name: "bedrock";
      variant: string;
      baseURL: string;
      customHeaders?: Record<string, string>;
      awsProfile: string;
    }
  | {
      name: "vertex-ai";
      variant: string;
      baseURL: string;
      customHeaders?: Record<string, string>;
      account?: string;
    };

export type ModelConfig =
  | {
      format: "anthropic";
      config: AnthropicModelConfig;
    }
  | {
      format: "gemini";
      config: GeminiModelConfig;
    }
  | {
      format: "openai-responses";
      config: OpenAIModelConfig;
    }
  | {
      format: "openai-messages";
      config: OpenAICompatibleModelConfig;
    };
