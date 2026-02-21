/**
 * @import { MessageContentToolUse } from "../model"
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { formatToolUse } from "./toolUse.mjs";

describe("formatToolUse", () => {
  it("should format exec_command tool use", () => {
    // given:
    /** @type {MessageContentToolUse} */
    const toolUse = {
      type: "tool_use",
      toolUseId: "test-1",
      toolName: "exec_command",
      input: { command: "ls", args: ["-la"] },
    };

    // when:
    const result = formatToolUse(toolUse);

    // then:
    assert.ok(result.includes("tool: exec_command"));
    assert.ok(result.includes('commnad: "ls"'));
    assert.ok(result.includes('args: ["-la"]'));
  });

  it("should format write_file tool use", () => {
    // given:
    /** @type {MessageContentToolUse} */
    const toolUse = {
      type: "tool_use",
      toolUseId: "test-1",
      toolName: "write_file",
      input: { filePath: "/tmp/test.txt", content: "Hello World" },
    };

    // when:
    const result = formatToolUse(toolUse);

    // then:
    assert.ok(result.includes("tool: write_file"));
    assert.ok(result.includes("filePath: /tmp/test.txt"));
    assert.ok(result.includes("content:"));
    assert.ok(result.includes("Hello World"));
  });

  it("should format patch_file tool use", () => {
    // given:
    /** @type {MessageContentToolUse} */
    const toolUse = {
      type: "tool_use",
      toolUseId: "test-1",
      toolName: "patch_file",
      input: {
        filePath: "/tmp/test.txt",
        diff: "<<<<<<< SEARCH\nold content\n=======\nnew content\n>>>>>>> REPLACE",
      },
    };

    // when:
    const result = formatToolUse(toolUse);

    // then:
    assert.ok(result.includes("tool: patch_file"));
    assert.ok(result.includes("path: /tmp/test.txt"));
    assert.ok(result.includes("diff:"));
  });

  it("should format tmux_command tool use", () => {
    // given:
    /** @type {MessageContentToolUse} */
    const toolUse = {
      type: "tool_use",
      toolUseId: "test-1",
      toolName: "tmux_command",
      input: { command: "new-session", args: ["-d", "-s", "test"] },
    };

    // when:
    const result = formatToolUse(toolUse);

    // then:
    assert.ok(result.includes("tool: tmux_command"));
    assert.ok(result.includes("commnad: new-session"));
    assert.ok(result.includes('args: ["-d","-s","test"]'));
  });

  it("should format search_web tool use", () => {
    // given:
    /** @type {MessageContentToolUse} */
    const toolUse = {
      type: "tool_use",
      toolUseId: "test-1",
      toolName: "search_web",
      input: { query: "Node.js testing" },
    };

    // when:
    const result = formatToolUse(toolUse);

    // then:
    assert.ok(result.includes("tool: search_web"));
    assert.ok(result.includes("query: Node.js testing"));
  });

  it("should format unknown tool use as JSON", () => {
    // given:
    const toolUse = {
      type: "tool_use",
      toolUseId: "test-1",
      toolName: "unknown_tool",
      input: { data: "test" },
      provider: "some-provider",
    };

    // when:
    const result = formatToolUse(
      /** @type {MessageContentToolUse} */ (toolUse),
    );

    // then:
    // provider should be filtered out
    assert.ok(!result.includes("provider"));
    assert.ok(result.includes("unknown_tool"));
    assert.ok(result.includes("data"));
  });
});
