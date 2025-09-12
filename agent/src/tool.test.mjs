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
    assert.equal(
      toolApprover.isAllowedToolUse(allowedToolUse),
      true,
      "should approve on first use",
    );
    assert.equal(
      toolApprover.isAllowedToolUse(allowedToolUse),
      true,
      "should approve on second use",
    );
    assert.equal(
      toolApprover.isAllowedToolUse(allowedToolUse),
      false,
      "should not approve on third use (exceeds maxApprovals)",
    );

    // when/then:
    toolApprover.resetApprovalCount();
    assert.equal(
      toolApprover.isAllowedToolUse(allowedToolUse),
      true,
      "should approve on first use after reset",
    );
  });

  it("should not approve disallowed tool use", () => {
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
    assert.equal(toolApprover.isAllowedToolUse(disallowedToolUse), false);
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
    assert.equal(
      toolApprover.isAllowedToolUse(toolUse),
      false,
      "should not approve disallowed tool use",
    );

    // when/then:
    toolApprover.allowToolUse(toolUse);
    assert.equal(
      toolApprover.isAllowedToolUse(toolUse),
      true,
      "should approve allowed tool use",
    );
  });
});
