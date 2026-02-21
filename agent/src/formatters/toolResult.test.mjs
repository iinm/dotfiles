/**
 * @import { MessageContentToolResult } from "../model"
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { formatToolResult } from "./toolResult.mjs";

describe("formatToolResult", () => {
  it("should format text content", () => {
    // given:
    /** @type {MessageContentToolResult} */
    const toolResult = {
      type: "tool_result",
      toolUseId: "test-1",
      toolName: "exec_command",
      content: [{ type: "text", text: "Hello World" }],
      isError: false,
    };

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.strictEqual(result, "Hello World");
  });

  it("should format image content", () => {
    // given:
    /** @type {MessageContentToolResult} */
    const toolResult = {
      type: "tool_result",
      toolUseId: "test-1",
      toolName: "exec_command",
      content: [
        { type: "image", mimeType: "image/png", data: "a".repeat(100) },
      ],
      isError: false,
    };

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("data:image/png;base64"));
    assert.ok(result.includes("..."));
  });

  it("should format error result", () => {
    // given:
    /** @type {MessageContentToolResult} */
    const toolResult = {
      type: "tool_result",
      toolUseId: "test-1",
      toolName: "exec_command",
      content: [{ type: "text", text: "Error message" }],
      isError: true,
    };

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("Error message"));
  });

  it("should format exec_command output with tags", () => {
    // given:
    /** @type {MessageContentToolResult} */
    const toolResult = {
      type: "tool_result",
      toolUseId: "test-1",
      toolName: "exec_command",
      content: [{ type: "text", text: "<stdout>output content</stdout>" }],
      isError: false,
    };

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("<stdout>"));
    assert.ok(result.includes("output content"));
  });

  it("should format exec_command truncated output", () => {
    // given:
    /** @type {MessageContentToolResult} */
    const toolResult = {
      type: "tool_result",
      toolUseId: "test-1",
      toolName: "exec_command",
      content: [
        {
          type: "text",
          text: '<truncated_output part="start">content</truncated_output>',
        },
      ],
      isError: false,
    };

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("<truncated_output"));
  });

  it("should format tmux_command output", () => {
    // given:
    /** @type {MessageContentToolResult} */
    const toolResult = {
      type: "tool_result",
      toolUseId: "test-1",
      toolName: "tmux_command",
      content: [{ type: "text", text: "<stdout>output</stdout>" }],
      isError: false,
    };

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("<stdout>"));
  });

  it("should truncate long content", () => {
    // given:
    /** @type {MessageContentToolResult} */
    const toolResult = {
      type: "tool_result",
      toolUseId: "test-1",
      toolName: "some_other_tool",
      content: [{ type: "text", text: "x".repeat(2000) }],
      isError: false,
    };

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.length < 1500);
    assert.ok(result.includes("... (Output truncated for display)"));
  });
});
