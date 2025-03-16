export type Tool = {
  def: ToolDefinition;
  impl: ToolImplementation;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

// biome-ignore lint/suspicious/noExplicitAny:
export type ToolImplementation = (input: any) => Promise<string | Error>;
