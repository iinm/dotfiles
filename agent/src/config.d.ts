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
    askGoogle?: {
      platform?: "vertex-ai";
      baseURL?: string;
      geminiApiKey?: string;
    };
  };
  mcpServers?: Record<string, MCPServerConfig>;
  notifyCmd?: string;
};

export type ModelProvidersConfig = {
  anthropic?: GenericModelProviderConfig;
  gemini?: GenericModelProviderConfig;
  openai?: GenericModelProviderConfig;
  xai?: GenericModelProviderConfig;
};

export type GenericModelProviderConfig = {
  platform?: "vertex-ai";
  baseURL?: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
};

export type MCPServerConfig = {
  command: string;
  args: string[];
  env?: Record<string, string>;
  options?: {
    enabledTools?: string[];
  };
};
