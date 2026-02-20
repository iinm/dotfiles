/**
 * @import { MessageContentToolUse } from "./model";
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { createToolUseApprover } from "./tool.mjs";

describe("createToolUseApprover", () => {
  it("should approve allowed tool use up to maxAutoApprovals", () => {
    // given:
    const toolApprover = createToolUseApprover({
      patterns: [{ toolName: "exec_command", input: { command: "ls" } }],
      maxApprovals: 2,
      maskApprovalInput: (_name, input) => input,
    });

    /** @type {MessageContentToolUse} */
    const allowedToolUse = {
      type: "tool_use",
      toolUseId: "test",
      toolName: "exec_command",
      input: { command: "ls" },
    };

    // when/then:
    assert.deepStrictEqual(
      toolApprover.isAllowedToolUse(allowedToolUse),
      { action: "allow" },
      "should approve on first use",
    );
    assert.deepStrictEqual(
      toolApprover.isAllowedToolUse(allowedToolUse),
      { action: "allow" },
      "should approve on second use",
    );
    assert.deepStrictEqual(
      toolApprover.isAllowedToolUse(allowedToolUse),
      { action: "ask" },
      "should not approve on third use (exceeds maxApprovals)",
    );

    // when/then:
    toolApprover.resetApprovalCount();
    assert.deepStrictEqual(
      toolApprover.isAllowedToolUse(allowedToolUse),
      { action: "allow" },
      "should approve on first use after reset",
    );
  });

  it("should not approve disallowed tool use (action: ask by default)", () => {
    // given:
    const toolApprover = createToolUseApprover({
      patterns: [{ toolName: "exec_command", input: { command: "ls" } }],
      maxApprovals: 2,
      maskApprovalInput: (_name, input) => input,
    });

    /** @type {MessageContentToolUse} */
    const disallowedToolUse = {
      type: "tool_use",
      toolUseId: "test",
      toolName: "exec_command",
      input: { command: "rm" },
    };

    // when/then:
    assert.deepStrictEqual(toolApprover.isAllowedToolUse(disallowedToolUse), {
      action: "ask",
    });
  });

  it("should deny tool use when action is deny", () => {
    // given:
    const toolApprover = createToolUseApprover({
      patterns: [
        {
          toolName: "exec_command",
          input: { command: "grep" },
          action: "deny",
          reason: "Use rg",
        },
      ],
      maxApprovals: 2,
      maskApprovalInput: (_name, input) => input,
    });

    /** @type {MessageContentToolUse} */
    const deniedToolUse = {
      type: "tool_use",
      toolUseId: "test",
      toolName: "exec_command",
      input: { command: "grep" },
    };

    // when/then:
    assert.deepStrictEqual(toolApprover.isAllowedToolUse(deniedToolUse), {
      action: "deny",
      reason: "Use rg",
    });
  });

  it("should mask input when allowed", () => {
    // given:
    const toolApprover = createToolUseApprover({
      patterns: [],
      maxApprovals: 2,
      maskApprovalInput: (_name, input) => {
        // ignore content
        const { filePath } = input;
        return { filePath };
      },
    });

    /** @type {MessageContentToolUse} */
    const toolUse = {
      type: "tool_use",
      toolUseId: "test",
      toolName: "write_file",
      input: { filePath: "allowed.txt", content: "hello" },
    };

    // when/then:
    assert.deepStrictEqual(
      toolApprover.isAllowedToolUse(toolUse),
      { action: "ask" },
      "should not approve disallowed tool use",
    );

    // when/then:
    toolApprover.allowToolUse(toolUse);
    assert.deepStrictEqual(
      toolApprover.isAllowedToolUse(toolUse),
      { action: "allow" },
      "should approve allowed tool use",
    );
  });
});
