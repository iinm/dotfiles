import assert from "node:assert";
import { describe, it } from "node:test";
import { createModelCaller, MODEL_REGISTRY } from "./modelRegistry.mjs";

describe("MODEL_REGISTRY", () => {
  it("should contain expected model names", () => {
    // then:
    assert.ok("gpt-thinking-low" in MODEL_REGISTRY);
    assert.ok("claude-sonnet-thinking-8k" in MODEL_REGISTRY);
    assert.ok("gemini-flash-thinking-low" in MODEL_REGISTRY);
    assert.ok("kimi" in MODEL_REGISTRY);
    assert.ok("deepseek" in MODEL_REGISTRY);
  });

  it("should have valid entry structure for each model", () => {
    // when/then:
    for (const [modelName, entry] of Object.entries(MODEL_REGISTRY)) {
      assert.ok(entry.provider, `Model ${modelName} should have provider`);
      assert.ok(
        typeof entry.caller === "function",
        `Model ${modelName} should have caller function`,
      );
      assert.ok(entry.params, `Model ${modelName} should have params`);
      assert.strictEqual(
        typeof entry.params,
        "object",
        `Model ${modelName} params should be an object`,
      );
    }
  });

  it("should have model parameter in params for most entries", () => {
    // when/then:
    for (const [modelName, entry] of Object.entries(MODEL_REGISTRY)) {
      // Gemini models have geminiModel instead
      if (!entry.geminiModel) {
        assert.ok(
          /** @type {{model?: string}} */ (entry.params).model,
          `Model ${modelName} should have params.model`,
        );
      }
    }
  });

  it("should group models by provider correctly", () => {
    // when:
    const openaiModels = Object.entries(MODEL_REGISTRY)
      .filter(([_, entry]) => entry.provider === "openai")
      .map(([name]) => name);

    const anthropicModels = Object.entries(MODEL_REGISTRY)
      .filter(([_, entry]) => entry.provider === "anthropic")
      .map(([name]) => name);

    // then:
    assert.ok(openaiModels.length > 0, "Should have OpenAI models");
    assert.ok(anthropicModels.length > 0, "Should have Anthropic models");
  });

  it("should have geminiModel for Gemini entries", () => {
    // when:
    const geminiModels = Object.entries(MODEL_REGISTRY).filter(
      ([_, entry]) => entry.provider === "google",
    );

    // then:
    for (const [modelName, entry] of geminiModels) {
      assert.ok(
        entry.geminiModel,
        `Gemini model ${modelName} should have geminiModel property`,
      );
    }
  });
});

describe("createModelCaller", () => {
  it("should throw error for invalid model name", () => {
    // given:
    const invalidModelName = "non-existent-model";

    // when/then:
    assert.throws(() => createModelCaller(invalidModelName), /Invalid model/);
  });

  it("should return a function for valid model", () => {
    // given:
    const modelName = "gpt-thinking-low";

    // when:
    const caller = createModelCaller(modelName);

    // then:
    assert.strictEqual(typeof caller, "function");
  });

  it("should return a function for Claude model", () => {
    // given:
    const modelName = "claude-sonnet-thinking-8k";

    // when:
    const caller = createModelCaller(modelName);

    // then:
    assert.strictEqual(typeof caller, "function");
  });

  it("should return a function for Gemini model", () => {
    // given:
    const modelName = "gemini-flash-thinking-low";

    // when:
    const caller = createModelCaller(modelName);

    // then:
    assert.strictEqual(typeof caller, "function");
  });

  it("should return a function for OpenAI Compatible model", () => {
    // given:
    const modelName = "kimi";

    // when:
    const caller = createModelCaller(modelName);

    // then:
    assert.strictEqual(typeof caller, "function");
  });

  it("should accept providers config", () => {
    // given:
    const modelName = "claude-sonnet-thinking-8k";
    const providers = {
      anthropic: { apiKey: "test-key" },
    };

    // when:
    const caller = createModelCaller(modelName, providers);

    // then:
    assert.strictEqual(typeof caller, "function");
  });

  it("should work with empty providers config", () => {
    // given:
    const modelName = "deepseek";

    // when:
    const caller = createModelCaller(modelName, {});

    // then:
    assert.strictEqual(typeof caller, "function");
  });
});
