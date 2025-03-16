export type Tool = {
  def: ToolDefinition;
  impl: ToolImplementation;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolImplementation = (input: any) => Promise<string | Error>;
