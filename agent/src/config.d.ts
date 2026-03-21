import { ModelDefinition, PlatformConfig } from "./modelDefinition";
import { ToolUsePattern } from "./tool";
import { ExecCommandSanboxConfig } from "./tools/execCommand";

export type AppConfig = {
  model?: string;
  models?: ModelDefinition[];
  platforms?: PlatformConfig[];
  autoApproval?: {
    patterns?: ToolUsePattern[];
    maxApprovals?: number;
    defaultAction?: "deny" | "ask";
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

export type MCPServerConfig = {
  command: string;
  args: string[];
  env?: Record<string, string>;
  options?: {
    enabledTools?: string[];
  };
};
