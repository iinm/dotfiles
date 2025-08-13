import { ToolUsePattern } from "./tool";
import { ExecCommandSanboxConfig } from "./tools/execCommand";

export type AppConfig = {
  model?: string;
  providers?: ModelProvidersConfig;
  autoApproval?: {
    patterns?: ToolUsePattern[];
    max?: number;
  };
  sandbox?: ExecCommandSanboxConfig;
  tools?: {
    tavily?: {
      apiKey?: string;
    };
  };
  mcpServers?: Record<string, MCPServerConfig>;
  notifyCmd?: string;
};

export type ModelProvidersConfig = {
  anthropic?: GenericModelProviderConfig;
  gemini?: GenericModelProviderConfig;
  openai?: GenericModelProviderConfig;
};

export type GenericModelProviderConfig = {
  apiKey?: string;
  baseURL?: string;
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
