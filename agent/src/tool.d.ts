import type { MessageContentToolUse } from "./model";

export type Tool = {
  def: ToolDefinition;
  impl: ToolImplementation;
  maskApprovalInput?: (
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
  patterns: ToolUsePattern[];
  max: number;

  /**
   * Mask the input before auto-approval checks and recording.
   * Return a redacted object (e.g., keep only necessary fields) that will be used for:
   * - pattern matching
   * - safety validation via isSafeToolInput
   * - storing per-session allowed tool-use patterns
   */
  maskApprovalInput: (
    toolName: string,
    input: Record<string, unknown>,
  ) => Record<string, unknown>;
};

export type ToolUseApprover = {
  isAllowedToolUse: (toolUse: MessageContentToolUse) => boolean;
  allowToolUse: (toolUse: MessageContentToolUse) => void;
};

export type ToolUsePattern = {
  toolName: string;
  input: ObjectPattern;
};

export type ToolUse = {
  toolName: string;
  input: Record<string, unknown>;
};
