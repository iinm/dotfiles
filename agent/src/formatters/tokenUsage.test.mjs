import assert from "node:assert";
import { describe, it } from "node:test";
import { formatProviderTokenUsage } from "./tokenUsage.mjs";

describe("formatProviderTokenUsage", () => {
  it("should format simple numeric usage", () => {
    // given:
    const usage = {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    };

    // when:
    const result = formatProviderTokenUsage(usage);

    // then:
    assert.ok(result.includes("inputTokens: 100"));
    assert.ok(result.includes("outputTokens: 50"));
    assert.ok(result.includes("totalTokens: 150"));
  });

  it("should format string values", () => {
    // given:
    const usage = {
      model: "claude-3-opus",
      provider: "anthropic",
    };

    // when:
    const result = formatProviderTokenUsage(usage);

    // then:
    assert.ok(result.includes("model: claude-3-opus"));
    assert.ok(result.includes("provider: anthropic"));
  });

  it("should format nested object values", () => {
    // given:
    const usage = {
      inputTokens: 100,
      outputTokens: 50,
      details: {
        cacheCreationInputTokens: 10,
        cacheReadInputTokens: 5,
      },
    };

    // when:
    const result = formatProviderTokenUsage(usage);

    // then:
    assert.ok(result.includes("inputTokens: 100"));
    assert.ok(
      result.includes(
        "(details) cacheCreationInputTokens: 10, cacheReadInputTokens: 5",
      ),
    );
  });

  it("should filter out ignored keys in nested objects", () => {
    // given:
    const usage = {
      inputTokens: 100,
      openaiDetails: {
        prompt_tokens: 100,
        completion_tokens: 50,
        audio_tokens: 100, // should be filtered
        accepted_prediction_tokens: 20, // should be filtered
        rejected_prediction_tokens: 5, // should be filtered
      },
    };

    // when:
    const result = formatProviderTokenUsage(usage);

    // then:
    assert.ok(result.includes("prompt_tokens: 100"));
    assert.ok(result.includes("completion_tokens: 50"));
    assert.ok(!result.includes("audio_tokens"));
    assert.ok(!result.includes("accepted_prediction_tokens"));
    assert.ok(!result.includes("rejected_prediction_tokens"));
  });
});
