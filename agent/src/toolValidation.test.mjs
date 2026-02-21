/**
 * @import { MessageContentToolUse, MessageContentToolResult } from "./model"
 * @import { Tool } from "./tool"
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

// === Factory Functions ===

let toolUseIdCounter = 0;

/** @returns {MessageContentToolUse} */
function createToolUse(toolName, input = {}) {
  return {
    type: "tool_use",
    toolUseId: `test-${++toolUseIdCounter}`,
    toolName,
    input,
  };
}

/** @returns {Map<string, Tool>} */
function createToolByName(toolNames) {
  return new Map(
    toolNames.map((name) => [
      name,
      {
        def: {
          name,
          description: `Description for ${name}`,
          inputSchema: { type: "object" },
        },
      },
    ]),
  );
}

// === Test Suites ===

describe("findUnknownToolNames", () => {
  const testCases = [
    {
      name: "should return empty array when all tools are known",
      toolUses: ["exec_command", "write_file"],
      knownTools: ["exec_command", "write_file"],
      expected: [],
    },
    {
      name: "should return unknown tool names",
      toolUses: ["exec_command", "unknown_tool", "another_unknown"],
      knownTools: ["exec_command"],
      expected: ["unknown_tool", "another_unknown"],
    },
    {
      name: "should return all tool names when none are known",
      toolUses: ["tool_a", "tool_b"],
      knownTools: [],
      expected: ["tool_a", "tool_b"],
    },
  ];

  for (const { name, toolUses, knownTools, expected } of testCases) {
    it(name, () => {
      const toolUseParts = toolUses.map((name) => createToolUse(name));
      const toolByName = createToolByName(knownTools);

      const result = findUnknownToolNames(toolUseParts, toolByName);

      assert.deepStrictEqual(result, expected);
    });
  }
});

describe("createUnknownToolResults", () => {
  it("should create error results for all tool uses", () => {
    const toolUseParts = [
      createToolUse("unknown_tool"),
      createToolUse("another_unknown"),
    ];

    const result = createUnknownToolResults(toolUseParts, [
      "unknown_tool",
      "another_unknown",
    ]);

    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0], {
      type: "tool_result",
      toolUseId: toolUseParts[0].toolUseId,
      toolName: "unknown_tool",
      content: [{ type: "text", text: "Tool call rejected" }],
      isError: true,
    });
  });
});

describe("createUnknownToolErrorMessage", () => {
  const testCases = [
    {
      name: "should create error message with available tools",
      unknown: ["unknown_tool"],
      known: ["exec_command", "write_file", "read_file"],
      contains: ["Tool not found unknown_tool", "Available tools:", "exec_command"],
    },
    {
      name: "should handle multiple unknown tools",
      unknown: ["tool_a", "tool_b"],
      known: ["known_tool"],
      contains: ["Tool not found tool_a, tool_b"],
    },
  ];

  for (const { name, unknown, known, contains } of testCases) {
    it(name, () => {
      const toolByName = createToolByName(known);

      const result = createUnknownToolErrorMessage(unknown, toolByName);

      for (const text of contains) {
        assert.ok(result.includes(text), `Should include "${text}"`);
      }
    });
  }
});

describe("validateExclusiveToolUse", () => {
  const exclusiveTools = ["delegate_to_subagent", "report_as_subagent"];
  const regularTool = "exec_command";

  const testCases = [
    {
      name: "should be valid when no exclusive tools are used",
      tools: [regularTool],
      expectedValid: true,
    },
    {
      name: "should be valid when one exclusive tool is used alone",
      tools: ["delegate_to_subagent"],
      expectedValid: true,
    },
    {
      name: "should be invalid when multiple exclusive tools are used",
      tools: ["delegate_to_subagent", "report_as_subagent"],
      expectedValid: false,
      violationType: "multiple",
      violatedTools: ["delegate_to_subagent", "report_as_subagent"],
    },
    {
      name: "should be invalid when exclusive tool is used with other tools",
      tools: ["delegate_to_subagent", regularTool],
      expectedValid: false,
      violationType: "with-others",
      violatedTools: ["delegate_to_subagent"],
    },
  ];

  for (const { name, tools, expectedValid, violationType, violatedTools } of testCases) {
    it(name, () => {
      const toolUseParts = tools.map((name) => createToolUse(name));

      const result = validateExclusiveToolUse(toolUseParts, exclusiveTools);

      assert.strictEqual(result.isValid, expectedValid);
      if (!expectedValid) {
        assert.strictEqual(result.violationType, violationType);
        assert.deepStrictEqual(result.violatedTools, violatedTools);
      }
    });
  }
});

describe("createExclusiveToolViolationResults", () => {
  it("should create error results for all tool uses", () => {
    const toolUseParts = [createToolUse("delegate"), createToolUse("exec")];

    const result = createExclusiveToolViolationResults(toolUseParts);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].isError, true);
    assert.strictEqual(result[0].content[0].text, "Tool call rejected");
  });
});

describe("createExclusiveToolViolationLogMessage", () => {
  const testCases = [
    {
      name: "should create log message for multiple exclusive tools",
      violationType: "multiple",
      violatedTools: ["delegate", "report"],
      expected: "multiple exclusive tool use",
    },
    {
      name: "should create log message for exclusive with others",
      violationType: "with-others",
      violatedTools: ["delegate"],
      expected: "exclusive tool use with other tools",
    },
  ];

  for (const { name, violationType, violatedTools, expected } of testCases) {
    it(name, () => {
      // @ts-ignore
      const result = createExclusiveToolViolationLogMessage(
        violatedTools,
        violationType,
      );

      assert.ok(result.includes(expected), `Should include "${expected}"`);
    });
  }
});

describe("validateToolUse", () => {
  const exclusiveTools = ["delegate_to_subagent"];

  const testCases = [
    {
      name: "should return valid for valid tool use",
      tools: ["exec_command"],
      expectedValid: true,
    },
    {
      name: "should return invalid for unknown tools",
      tools: ["unknown_tool"],
      knownTools: [],
      expectedValid: false,
      errorContains: "Tool not found",
    },
    {
      name: "should return invalid for exclusive tool violation",
      tools: ["delegate_to_subagent", "exec_command"],
      knownTools: ["delegate_to_subagent", "exec_command"],
      expectedValid: false,
      errorContains: "cannot be called with other tools",
    },
  ];

  for (const { name, tools, knownTools = tools, expectedValid, errorContains } of testCases) {
    it(name, () => {
      const toolUseParts = tools.map((name) => createToolUse(name));
      const toolByName = createToolByName(knownTools);

      const result = validateToolUse(toolUseParts, toolByName, exclusiveTools);

      assert.strictEqual(result.isValid, expectedValid);
      if (errorContains) {
        assert.ok(result.errorMessage?.includes(errorContains));
      }
    });
  }
});
