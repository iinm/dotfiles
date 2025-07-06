import type { ToolUsePattern } from "./tool";

export type AgentConfig = {
  model?: string;
  allowedToolUsePatterns?: ToolUsePattern[];
  mcpServers?: Record<string, MCPServerConfig>;
  providers?: AgentModelProviders;
  tools?: {
    tavily?: {
      apiKey?: string;
    };
  };
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
