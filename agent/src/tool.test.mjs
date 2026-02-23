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
      patterns: [
        { toolName: "exec_command", input: { command: "ls" }, action: "allow" },
      ],
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
      patterns: [
        { toolName: "exec_command", input: { command: "ls" }, action: "allow" },
      ],
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

  it("should ask when action is invalid (typo)", () => {
    // given:
    const toolApprover = createToolUseApprover({
      patterns: [
        // @ts-expect-error
        { toolName: "exec_command", input: { command: "ls" }, action: "denyy" },
      ],
      maxApprovals: 2,
      maskApprovalInput: (_name, input) => input,
    });

    /** @type {MessageContentToolUse} */
    const toolUse = {
      type: "tool_use",
      toolUseId: "test",
      toolName: "exec_command",
      input: { command: "ls" },
    };

    // when/then:
    assert.deepStrictEqual(toolApprover.isAllowedToolUse(toolUse), {
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

  it("should match tool use when pattern.input is undefined", () => {
    // given:
    const toolApprover = createToolUseApprover({
      patterns: [
        { toolName: "delegate_to_subagent", action: "allow" },
        { toolName: /^report_as_subagent$/, action: "allow" },
      ],
      maxApprovals: 5,
      maskApprovalInput: (_name, input) => input,
    });

    /** @type {MessageContentToolUse} */
    const delegateToolUse = {
      type: "tool_use",
      toolUseId: "test1",
      toolName: "delegate_to_subagent",
      input: { name: "researcher", goal: "Find information" },
    };

    /** @type {MessageContentToolUse} */
    const reportToolUse = {
      type: "tool_use",
      toolUseId: "test2",
      toolName: "report_as_subagent",
      input: { memoryPath: ".agent/memory/test.md" },
    };

    // when/then:
    assert.deepStrictEqual(
      toolApprover.isAllowedToolUse(delegateToolUse),
      { action: "allow" },
      "should approve delegate_to_subagent without input pattern",
    );
    assert.deepStrictEqual(
      toolApprover.isAllowedToolUse(reportToolUse),
      { action: "allow" },
      "should approve report_as_subagent without input pattern",
    );
  });
});
