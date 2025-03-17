import type { MessageContentToolUse } from "./model";

export type Tool = {
  def: ToolDefinition;
  impl: ToolImplementation;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolImplementation = (input: Record) => Promise<string | Error>;

export type ToolUseApproverConfig = {
  allowedToolUses: ToolUsePattern[];
  maxApproveCount: number;
};

export type ToolUseApprover = (toolUse: MessageContentToolUse) => boolean;

export type ToolUsePattern = {
  toolName: string;
  input: ObjectPattern;
};
