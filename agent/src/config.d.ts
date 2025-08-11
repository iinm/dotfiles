import { ToolUsePattern } from "./tool";

export type AppConfig = {
  model?: string;
  providers?: AgentModelProviders;
  permissions?: {
    allow?: ToolUsePattern[];
    maxAutoApprovals?: number;
  };
  tools?: {
    tavily?: {
      apiKey?: string;
    };
  };
  mcpServers?: Record<string, MCPServerConfig>;
  notifyCmd?: string;
};

export type AgentModelProviders = {
  gemini?: GenericModelProviderConfig;
  anthropic?: GenericModelProviderConfig;
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
