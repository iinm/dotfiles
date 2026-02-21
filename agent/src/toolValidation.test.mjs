/**
 * @import { MessageContentToolUse, MessageContentToolResult } from "./model"
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
  createExclusiveToolViolationLogMessage,
  createExclusiveToolViolationResults,
  createUnknownToolErrorMessage,
  createUnknownToolResults,
  findUnknownToolNames,
  validateExclusiveToolUse,
  validateToolUse,
} from "./toolValidation.mjs";

describe("findUnknownToolNames", () => {
  it("should return empty array when all tools are known", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      {
        type: "tool_use",
        toolUseId: "1",
        toolName: "exec_command",
        input: { command: "ls" },
      },
      {
        type: "tool_use",
        toolUseId: "2",
        toolName: "write_file",
        input: { filePath: "test.txt" },
      },
    ];
    const toolByName = new Map([
      ["exec_command", {}],
      ["write_file", {}],
    ]);

    // when:
    const result = findUnknownToolNames(toolUseParts, toolByName);

    // then:
    assert.deepStrictEqual(result, []);
  });

  it("should return unknown tool names", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      {
        type: "tool_use",
        toolUseId: "1",
        toolName: "exec_command",
        input: { command: "ls" },
      },
      { type: "tool_use", toolUseId: "2", toolName: "unknown_tool", input: {} },
      {
        type: "tool_use",
        toolUseId: "3",
        toolName: "another_unknown",
        input: {},
      },
    ];
    const toolByName = new Map([["exec_command", {}]]);

    // when:
    const result = findUnknownToolNames(toolUseParts, toolByName);

    // then:
    assert.deepStrictEqual(result, ["unknown_tool", "another_unknown"]);
  });

  it("should return all tool names when none are known", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      { type: "tool_use", toolUseId: "1", toolName: "tool_a", input: {} },
      { type: "tool_use", toolUseId: "2", toolName: "tool_b", input: {} },
    ];
    const toolByName = new Map();

    // when:
    const result = findUnknownToolNames(toolUseParts, toolByName);

    // then:
    assert.deepStrictEqual(result, ["tool_a", "tool_b"]);
  });
});

describe("createUnknownToolResults", () => {
  it("should create error results for all tool uses", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      { type: "tool_use", toolUseId: "1", toolName: "unknown_tool", input: {} },
      {
        type: "tool_use",
        toolUseId: "2",
        toolName: "another_unknown",
        input: {},
      },
    ];

    // when:
    const result = createUnknownToolResults(toolUseParts, [
      "unknown_tool",
      "another_unknown",
    ]);

    // then:
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0], {
      type: "tool_result",
      toolUseId: "1",
      toolName: "unknown_tool",
      content: [{ type: "text", text: "Tool call rejected" }],
      isError: true,
    });
    assert.deepStrictEqual(result[1], {
      type: "tool_result",
      toolUseId: "2",
      toolName: "another_unknown",
      content: [{ type: "text", text: "Tool call rejected" }],
      isError: true,
    });
  });
});

describe("createUnknownToolErrorMessage", () => {
  it("should create error message with available tools", () => {
    // given:
    const unknownToolNames = ["unknown_tool"];
    const toolByName = new Map([
      ["exec_command", {}],
      ["write_file", {}],
      ["read_file", {}],
    ]);

    // when:
    const result = createUnknownToolErrorMessage(unknownToolNames, toolByName);

    // then:
    assert.ok(result.includes("Tool not found unknown_tool"));
    assert.ok(result.includes("Available tools:"));
    assert.ok(result.includes("exec_command"));
    assert.ok(result.includes("write_file"));
    assert.ok(result.includes("read_file"));
  });

  it("should handle multiple unknown tools", () => {
    // given:
    const unknownToolNames = ["tool_a", "tool_b"];
    const toolByName = new Map([["known_tool", {}]]);

    // when:
    const result = createUnknownToolErrorMessage(unknownToolNames, toolByName);

    // then:
    assert.ok(result.includes("Tool not found tool_a, tool_b"));
  });
});

describe("validateExclusiveToolUse", () => {
  it("should return valid when no exclusive tools are used", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      { type: "tool_use", toolUseId: "1", toolName: "exec_command", input: {} },
    ];
    const exclusiveToolNames = ["delegate_to_subagent", "report_as_subagent"];

    // when:
    const result = validateExclusiveToolUse(toolUseParts, exclusiveToolNames);

    // then:
    assert.strictEqual(result.isValid, true);
  });

  it("should return valid when one exclusive tool is used alone", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      {
        type: "tool_use",
        toolUseId: "1",
        toolName: "delegate_to_subagent",
        input: {},
      },
    ];
    const exclusiveToolNames = ["delegate_to_subagent", "report_as_subagent"];

    // when:
    const result = validateExclusiveToolUse(toolUseParts, exclusiveToolNames);

    // then:
    assert.strictEqual(result.isValid, true);
  });

  it("should return invalid when multiple exclusive tools are used", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      {
        type: "tool_use",
        toolUseId: "1",
        toolName: "delegate_to_subagent",
        input: {},
      },
      {
        type: "tool_use",
        toolUseId: "2",
        toolName: "report_as_subagent",
        input: {},
      },
    ];
    const exclusiveToolNames = ["delegate_to_subagent", "report_as_subagent"];

    // when:
    const result = validateExclusiveToolUse(toolUseParts, exclusiveToolNames);

    // then:
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errorMessage?.includes("cannot be called together"));
    assert.strictEqual(result.violationType, "multiple");
    assert.deepStrictEqual(result.violatedTools, [
      "delegate_to_subagent",
      "report_as_subagent",
    ]);
  });

  it("should return invalid when exclusive tool is used with other tools", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      {
        type: "tool_use",
        toolUseId: "1",
        toolName: "delegate_to_subagent",
        input: {},
      },
      { type: "tool_use", toolUseId: "2", toolName: "exec_command", input: {} },
    ];
    const exclusiveToolNames = ["delegate_to_subagent", "report_as_subagent"];

    // when:
    const result = validateExclusiveToolUse(toolUseParts, exclusiveToolNames);

    // then:
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errorMessage?.includes("cannot be called with other tools"),
    );
    assert.strictEqual(result.violationType, "with-others");
    assert.deepStrictEqual(result.violatedTools, ["delegate_to_subagent"]);
  });
});

describe("createExclusiveToolViolationResults", () => {
  it("should create error results for all tool uses", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      { type: "tool_use", toolUseId: "1", toolName: "tool_a", input: {} },
      { type: "tool_use", toolUseId: "2", toolName: "tool_b", input: {} },
    ];

    // when:
    const result = createExclusiveToolViolationResults(toolUseParts);

    // then:
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].isError, true);
    assert.strictEqual(result[1].isError, true);
  });
});

describe("createExclusiveToolViolationLogMessage", () => {
  it("should create log message for multiple exclusive tools", () => {
    // given:
    const violatedTools = ["tool_a", "tool_b"];

    // when:
    const result = createExclusiveToolViolationLogMessage(
      violatedTools,
      "multiple",
    );

    // then:
    assert.ok(result.includes("Rejected multiple exclusive tool use"));
    assert.ok(result.includes("tool_a"));
    assert.ok(result.includes("tool_b"));
  });

  it("should create log message for exclusive tool with others", () => {
    // given:
    const violatedTools = ["tool_a"];

    // when:
    const result = createExclusiveToolViolationLogMessage(
      violatedTools,
      "with-others",
    );

    // then:
    assert.ok(result.includes("Rejected exclusive tool use with other tools"));
    assert.ok(result.includes("tool_a"));
  });
});

describe("validateToolUse", () => {
  it("should return valid when all checks pass", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      { type: "tool_use", toolUseId: "1", toolName: "exec_command", input: {} },
    ];
    const toolByName = new Map([["exec_command", {}]]);
    const exclusiveToolNames = ["delegate_to_subagent"];

    // when:
    const result = validateToolUse(
      toolUseParts,
      toolByName,
      exclusiveToolNames,
    );

    // then:
    assert.strictEqual(result.isValid, true);
  });

  it("should return invalid for unknown tools (skip exclusive check)", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      { type: "tool_use", toolUseId: "1", toolName: "unknown_tool", input: {} },
      {
        type: "tool_use",
        toolUseId: "2",
        toolName: "delegate_to_subagent",
        input: {},
      },
    ];
    const toolByName = new Map([["delegate_to_subagent", {}]]);
    const exclusiveToolNames = ["delegate_to_subagent"];

    // when:
    const result = validateToolUse(
      toolUseParts,
      toolByName,
      exclusiveToolNames,
    );

    // then:
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errorMessage?.includes("Tool not found"));
    assert.ok(result.toolResults);
    assert.strictEqual(result.toolResults?.length, 2);
  });

  it("should return invalid for exclusive tool violation when all tools are known", () => {
    // given:
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      {
        type: "tool_use",
        toolUseId: "1",
        toolName: "delegate_to_subagent",
        input: {},
      },
      { type: "tool_use", toolUseId: "2", toolName: "exec_command", input: {} },
    ];
    const toolByName = new Map([
      ["delegate_to_subagent", {}],
      ["exec_command", {}],
    ]);
    const exclusiveToolNames = ["delegate_to_subagent"];

    // when:
    const result = validateToolUse(
      toolUseParts,
      toolByName,
      exclusiveToolNames,
    );

    // then:
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errorMessage?.includes("cannot be called with other tools"),
    );
    assert.ok(result.toolResults);
  });
});
