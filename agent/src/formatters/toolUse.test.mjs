/**
 * @import { MessageContentToolUse } from "../model"
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { formatToolUse } from "./toolUse.mjs";

/**
 * Factory function for creating tool use objects
 * @param {string} toolName
 * @param {Record<string, unknown>} input
 * @returns {MessageContentToolUse}
 */
function createToolUse(toolName, input) {
  return {
    type: "tool_use",
    toolUseId: `test-${toolName}`,
    toolName,
    input,
  };
}

describe("formatToolUse", () => {
  const testCases = [
    {
      name: "exec_command tool use",
      toolUse: createToolUse("exec_command", { command: "ls", args: ["-la"] }),
      expectedIncludes: [
        "tool: exec_command",
        'commnad: "ls"',
        'args: ["-la"]',
      ],
    },
    {
      name: "write_file tool use",
      toolUse: createToolUse("write_file", {
        filePath: "/tmp/test.txt",
        content: "Hello World",
      }),
      expectedIncludes: [
        "tool: write_file",
        "filePath: /tmp/test.txt",
        "content:",
        "Hello World",
      ],
    },
    {
      name: "patch_file tool use",
      toolUse: createToolUse("patch_file", {
        filePath: "/tmp/test.txt",
        diff: "<<<<<<< SEARCH\nold content\n=======\nnew content\n>>>>>>> REPLACE",
      }),
      expectedIncludes: ["tool: patch_file", "path: /tmp/test.txt", "diff:"],
    },
    {
      name: "tmux_command tool use",
      toolUse: createToolUse("tmux_command", {
        command: "new-session",
        args: ["-d", "-s", "test"],
      }),
      expectedIncludes: [
        "tool: tmux_command",
        "commnad: new-session",
        'args: ["-d","-s","test"]',
      ],
    },
    {
      name: "search_web tool use",
      toolUse: createToolUse("search_web", { query: "Node.js testing" }),
      expectedIncludes: ["tool: search_web", "query: Node.js testing"],
    },
  ];

  for (const { name, toolUse, expectedIncludes } of testCases) {
    it(`should format ${name}`, () => {
      // when:
      const result = formatToolUse(toolUse);

      // then:
      for (const expected of expectedIncludes) {
        assert.ok(
          result.includes(expected),
          `Expected to include: ${expected}`,
        );
      }
    });
  }

  it("should format unknown tool use as JSON", () => {
    // given:
    const toolUse = createToolUse("unknown_tool", { data: "test" });

    // when:
    const result = formatToolUse(toolUse);

    // then:
    assert.ok(result.includes("unknown_tool"));
    assert.ok(result.includes("data"));
  });
});
