export type Model = Awaited<ReturnType<typeof createModel>>;

export async function createModel(modelName: string) {
  switch (modelName) {
    case "gpt-4o-mini":
      return await import("@langchain/openai").then(
        (m) =>
          new m.ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0,
          }),
      );
    case "o3-mini-medium":
      return await import("@langchain/openai").then(
        (m) =>
          new m.ChatOpenAI({
            model: "o3-mini",
            reasoningEffort: "medium",
          }),
      );
    case "o3-mini-high":
      return await import("@langchain/openai").then(
        (m) =>
          new m.ChatOpenAI({
            model: "o3-mini",
            reasoningEffort: "high",
          }),
      );
    case "claude-3-5-haiku":
      return await import("@langchain/anthropic").then(
        (m) =>
          new m.ChatAnthropic({
            model: "claude-3-5-haiku-latest",
            temperature: 0,
          }),
      );
    case "claude-3-7-sonnet":
      return await import("@langchain/anthropic").then(
        (m) =>
          new m.ChatAnthropic({
            model: "claude-3-7-sonnet-latest",
            temperature: 0,
          }),
      );
    case "claude-3-7-sonnet-thinking":
      return await import("@langchain/anthropic").then(
        (m) =>
          new m.ChatAnthropic({
            model: "claude-3-7-sonnet-latest",
            maxTokens: 1024 * 8,
            thinking: {
              type: "enabled",
              budget_tokens: 1024,
            },
          }),
      );
    case "gemini-2.0-flash":
      return await import("@langchain/google-vertexai").then(
        (m) =>
          new m.ChatVertexAI({
            model: "gemini-2.0-flash-001",
            temperature: 0,
          }),
      );
    default:
      throw new Error(`Invalid model: ${modelName}`);
  }
}
