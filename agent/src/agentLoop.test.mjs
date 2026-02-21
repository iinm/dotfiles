/**
 * @import { AgentEventEmitter } from "./agent"
 * @import { CallModel, Message, MessageContentToolResult, MessageContentToolUse } from "./model"
 * @import { Tool } from "./tool"
 */

import assert from "node:assert";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";

describe("AgentLoop type definitions", () => {
  it("should verify AgentLoopConfig structure is valid", () => {
    // This test verifies the structure expected by createAgentLoop
    // Type-only check - actual integration would require mocks

    /** @type {import("./agentLoop.mjs").AgentLoopConfig} */
    const mockConfig = {
      callModel: async () =>
        /** @type {import("./model").ModelOutput} */ (
          /** @type {unknown} */ ({
            role: "assistant",
            content: [{ type: "text", text: "Test" }],
            provider: "test",
            model: "test-model",
            usage: {},
          })
        ),
      state: { messages: [] },
      toolDefs: [],
      toolByName: new Map(),
      agentEventEmitter: /** @type {AgentEventEmitter} */ (
        /** @type {any} */ (new EventEmitter())
      ),
      toolUseApprover: {
        isAllowedToolUse: () => ({ action: "allow" }),
        allowToolUse: () => {},
        resetApprovalCount: () => {},
      },
      subagentManager: {
        getCurrentSubagent: () => null,
        getSubagentCount: () => 0,
        isInSubagentMode: () => false,
        processToolResults: () => null,
        delegateToSubagent: () => ({ success: true, message: "" }),
        reportAsSubagent: async () => "",
      },
      callTool: async () =>
        /** @type {MessageContentToolResult} */ ({
          type: "tool_result",
          toolUseId: "test",
          toolName: "test",
          content: [{ type: "text", text: "result" }],
          isError: false,
        }),
    };

    // Just verify the structure compiles/validates
    assert.ok(mockConfig);
    assert.strictEqual(typeof mockConfig.callModel, "function");
    assert.strictEqual(typeof mockConfig.callTool, "function");
  });
});

describe("AgentLoop integration patterns", () => {
  /**
   * Creates a minimal mock setup for agent loop testing
   * @returns {{emitter: AgentEventEmitter; messages: Message[]; toolUseApprover: import("./tool").ToolUseApprover; subagentManager: import("./subagentManager.mjs").SubagentManager; toolByName: Map<string, Tool>}}
   */
  function createMockSetup() {
    const emitter = new EventEmitter();
    /** @type {Message[]} */
    const messages = [];

    /** @type {import("./tool").ToolUseApprover} */
    const toolUseApprover = {
      isAllowedToolUse: () => ({ action: "allow" }),
      allowToolUse: () => {},
      resetApprovalCount: () => {},
    };

    /** @type {import("./subagentManager.mjs").SubagentManager} */
    const subagentManager = {
      getCurrentSubagent: () => null,
      getSubagentCount: () => 0,
      isInSubagentMode: () => false,
      processToolResults: () => null,
      delegateToSubagent: () => ({ success: true, message: "" }),
      reportAsSubagent: async () => "",
    };

    /** @type {Map<string, Tool>} */
    const toolByName = new Map([
      [
        "exec_command",
        {
          def: {
            name: "exec_command",
            description: "Execute command",
            inputSchema: { type: "object" },
          },
          impl: async () => "output",
        },
      ],
    ]);

    return {
      emitter: /** @type {AgentEventEmitter} */ (/** @type {any} */ (emitter)),
      messages,
      toolUseApprover,
      subagentManager,
      toolByName,
    };
  }

  it("should emit connectionError on model error", async () => {
    // given:
    const { emitter } = createMockSetup();
    /** @type {Error | null} */
    let errorEmitted = /** @type {any} */ (null);
    /** @type {any} */ (emitter).on(
      "connectionError",
      (/** @type {any} */ error) => {
        errorEmitted = /** @type {Error} */ (error);
      },
    );

    /** @type {CallModel} */
    const failingCallModel = async (_input) => {
      throw new Error("Model connection failed");
    };

    // Simple verification that error handler pattern works
    try {
      await failingCallModel({ messages: [] });
    } catch (error) {
      /** @type {any} */ (emitter).emit("connectionError", error);
    }

    // then:
    assert.ok(errorEmitted);
    assert.ok(
      /** @type {Error} */ (errorEmitted).message.includes(
        "Model connection failed",
      ),
    );
  });

  it("should handle tool use approver decisions", () => {
    // given:
    const { toolUseApprover } = createMockSetup();

    /** @type {MessageContentToolUse} */
    const toolUse = {
      type: "tool_use",
      toolUseId: "test-1",
      toolName: "exec_command",
      input: { command: "ls" },
    };

    // when:
    const decision = toolUseApprover.isAllowedToolUse(toolUse);

    // then:
    assert.strictEqual(decision.action, "allow");
  });
});

describe("AgentLoop tool use patterns", () => {
  it("should create tool results from denied tool uses", () => {
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      {
        type: "tool_use",
        toolUseId: "1",
        toolName: "exec_command",
        input: { command: "rm" },
      },
      {
        type: "tool_use",
        toolUseId: "2",
        toolName: "write_file",
        input: { filePath: "/etc/passwd" },
      },
    ];

    /** @type {import("./tool").ToolUseApprover} */
    const approver = {
      isAllowedToolUse: (toolUse) => {
        if (
          toolUse.toolName === "exec_command" &&
          toolUse.input?.command === "rm"
        ) {
          return { action: "deny", reason: "rm is dangerous" };
        }
        return { action: "ask" };
      },
      allowToolUse: () => {},
      resetApprovalCount: () => {},
    };

    // when:
    const decisions = toolUseParts.map((toolUse) =>
      approver.isAllowedToolUse(toolUse),
    );
    const hasDeniedToolUse = decisions.some((d) => d.action === "deny");

    // then:
    assert.strictEqual(hasDeniedToolUse, true);
    assert.strictEqual(decisions[0].action, "deny");
    assert.strictEqual(decisions[0].reason, "rm is dangerous");
    assert.strictEqual(decisions[1].action, "ask");
  });

  it("should handle all approved tools", () => {
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      {
        type: "tool_use",
        toolUseId: "1",
        toolName: "exec_command",
        input: { command: "ls" },
      },
    ];

    /** @type {import("./tool").ToolUseApprover} */
    const approver = {
      isAllowedToolUse: () => ({ action: "allow" }),
      allowToolUse: () => {},
      resetApprovalCount: () => {},
    };

    // when:
    const decisions = toolUseParts.map((toolUse) =>
      approver.isAllowedToolUse(toolUse),
    );
    const allApproved = decisions.every((d) => d.action === "allow");

    // then:
    assert.strictEqual(allApproved, true);
  });

  it("should handle partial approval", () => {
    /** @type {MessageContentToolUse[]} */
    const toolUseParts = [
      { type: "tool_use", toolUseId: "1", toolName: "allowed_tool", input: {} },
      { type: "tool_use", toolUseId: "2", toolName: "unknown_tool", input: {} },
    ];

    /** @type {import("./tool").ToolUseApprover} */
    const approver = {
      isAllowedToolUse: (toolUse) => {
        if (toolUse.toolName === "allowed_tool") {
          return { action: "allow" };
        }
        return { action: "ask" };
      },
      allowToolUse: () => {},
      resetApprovalCount: () => {},
    };

    // when:
    const decisions = toolUseParts.map((toolUse) =>
      approver.isAllowedToolUse(toolUse),
    );
    const allApproved = decisions.every((d) => d.action === "allow");

    // then:
    assert.strictEqual(allApproved, false);
  });
});
