import type { ToolDefinition } from "./tool";

export type CallModel = (input: ModelInput) => Promise<Message | Error>;

export type ModelInput = {
  messages: Message[];
  tools?: ToolDefinition[];
};

export type MessageStrict =
  | {
      role: "system";
      content: MessageContentText[];
    }
  | {
      role: "user";
      content: (MessageContentText | MessageContentToolResult)[];
    }
  | {
      role: "assistant";
      content: (MessageContentText | MessageContentToolUse)[];
    };

export type Message = {
  role: "system" | "user" | "assistant";
  content: MessageContent[];
};

export type MessageContent =
  | MessageContentText
  | MessageContentToolUse
  | MessageContentToolResult;

type MessageContentText = {
  type: "text";
  text: string;
};

type MessageContentToolUse = {
  type: "tool_use";
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
};

type MessageContentToolResult = {
  type: "tool_result";
  toolUseId: string;
  content: string;
  isError?: boolean;
};
