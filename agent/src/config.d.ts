import { ToolUsePattern } from "./tool";
import { ExecCommandSanboxConfig } from "./tools/execCommand";

export type AppConfig = {
  model?: string;
  providers?: ModelProvidersConfig;
  autoApproval?: {
    patterns?: ToolUsePattern[];
    maxApprovals?: number;
  };
  sandbox?: ExecCommandSanboxConfig;
  tools?: {
    tavily?: {
      apiKey?: string;
    };
    /**
     * - Vertex AI: requires baseURL and account
     * - AI Studio: requires apiKey
     */
    askGoogle?: {
      platform?: "vertex-ai";
      baseURL?: string;
      account?: string;
      apiKey?: string;
      model?: string;
    };
  };
  mcpServers?: Record<string, MCPServerConfig>;
  notifyCmd?: string;
};

export type ModelProvidersConfig = {
  anthropic?: GenericModelProviderConfig;
  gemini?: GenericModelProviderConfig;
  openai?: GenericModelProviderConfig;
  moonshotai?: GenericModelProviderConfig;
  deepseek?: GenericModelProviderConfig;
  minimax?: GenericModelProviderConfig;
  qwen?: GenericModelProviderConfig;
  zai?: GenericModelProviderConfig;
  xai?: GenericModelProviderConfig;
  [key: string]: GenericModelProviderConfig | undefined;
};

export type GenericModelProviderConfig = {
  platform?: "vertex-ai" | "bedrock" | "azure";
  baseURL?: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  modelMap?: Record<string, string>;

  azure?: {
    azureConfigDir?: string;
  };
  bedrock?: {
    awsProfile?: string;
  };
  vertexAI?: {
    account?: string;
  };
};

export type MCPServerConfig = {
  command: string;
  args: string[];
  env?: Record<string, string>;
  options?: {
    enabledTools?: string[];
  };
};
