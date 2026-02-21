/**
 * @import { MessageContentToolResult, MessageContentText } from "../model"
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { formatToolResult } from "./toolResult.mjs";

/**
 * Factory function for creating text content
 * @param {string} text
 * @returns {MessageContentText}
 */
function createTextContent(text) {
  return { type: "text", text };
}

/**
 * Factory function for creating tool result
 * @param {Object} params
 * @param {string} params.toolName
 * @param {import("../model").MessageContentToolResult['content']} params.content
 * @param {boolean} [params.isError]
 * @returns {MessageContentToolResult}
 */
function createToolResult({ toolName, content, isError = false }) {
  return {
    type: "tool_result",
    toolUseId: `test-${toolName}`,
    toolName,
    content,
    isError,
  };
}

describe("formatToolResult", () => {
  it("should format text content", () => {
    // given:
    const toolResult = createToolResult({
      toolName: "exec_command",
      content: [createTextContent("Hello World")],
    });

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
    const toolResult = createToolResult({
      toolName: "exec_command",
      content: [createTextContent("Error message")],
      isError: true,
    });

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("Error message"));
  });

  it("should format exec_command output with tags", () => {
    // given:
    const toolResult = createToolResult({
      toolName: "exec_command",
      content: [createTextContent("<stdout>output content</stdout>")],
    });

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("<stdout>"));
    assert.ok(result.includes("output content"));
  });

  it("should format exec_command truncated output", () => {
    // given:
    const toolResult = createToolResult({
      toolName: "exec_command",
      content: [
        createTextContent(
          '<truncated_output part="start">content</truncated_output>',
        ),
      ],
    });

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("<truncated_output"));
  });

  it("should format tmux_command output", () => {
    // given:
    const toolResult = createToolResult({
      toolName: "tmux_command",
      content: [createTextContent("<stdout>output</stdout>")],
    });

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.includes("<stdout>"));
  });

  it("should truncate long content", () => {
    // given:
    const toolResult = createToolResult({
      toolName: "some_other_tool",
      content: [createTextContent("x".repeat(2000))],
    });

    // when:
    const result = formatToolResult(toolResult);

    // then:
    assert.ok(result.length < 1500);
    assert.ok(result.includes("... (Output truncated for display)"));
  });
});
