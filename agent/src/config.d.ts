import type { ToolUsePattern } from "./tool";

export interface LocalConfig {
  allowedToolUsePatterns?: ToolUsePattern[];
  mcpServers?: Record<string, MCPServerConfig>;
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  agentConfig?: {
    enabledTools?: string[];
  };
}
