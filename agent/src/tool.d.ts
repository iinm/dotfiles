import type { MessageContentToolUse } from "./model";

export type Tool = {
  def: ToolDefinition;
  impl: ToolImplementation;
  maskAllowedInput?: (
    input: Record<string, unknown>,
  ) => Record<string, unknown>;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolImplementation = (
  input: Record,
) => Promise<string | StructuredToolResultContent[] | Error>;

export type StructuredToolResultContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      // base64 encoded
      data: string;
      // e.g., image/jpeg
      mimeType: string;
    };

export type ToolUseApproverConfig = {
  allowedToolUses: ToolUsePattern[];
  maxAutoApprovals: number;
  // Mask the input when adding a new approve pattern
  maskAllowedInput: (
    toolName: string,
    input: Record<string, unknown>,
  ) => Record<string, unknown>;
};

export type ToolUseApprover = {
  isAllowedToolUse: (toolUse: MessageContentToolUse) => boolean;
  allowToolUse: (toolUse: MessageContentToolUse) => void;
};

export type ToolUseRewriteRule = {
  pattern: ToolUsePattern;
  rewrite: ToolUseRewriter;
};

export type ToolUsePattern = {
  toolName: string;
  input: ObjectPattern;
};

export type ToolUseRewriter = (toolUse: ToolUse) => ToolUse;

export type ToolUse = {
  toolName: string;
  input: Record<string, unknown>;
};
