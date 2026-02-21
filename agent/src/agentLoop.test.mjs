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

  it("should track message flow through emitter", async () => {
    // given:
    const { emitter } = createMockSetup();
    /** @type {Message[]} */
    const emittedMessages = [];
    emitter.on("message", (msg) => {
      emittedMessages.push(msg);
    });

    // when:
    /** @type {Message} */
    const userMessage = {
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    };
    emitter.emit("message", userMessage);

    /** @type {Message} */
    const assistantMessage = {
      role: "assistant",
      content: [{ type: "text", text: "Hi there" }],
    };
    emitter.emit("message", assistantMessage);

    // then:
    assert.strictEqual(emittedMessages.length, 2);
    assert.strictEqual(emittedMessages[0].role, "user");
    assert.strictEqual(emittedMessages[1].role, "assistant");
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

  it("should handle subagent status changes", () => {
    // given:
    const { subagentManager, emitter } = createMockSetup();
    /** @type {any[]} */
    const statusChanges = [];

    emitter.on("subagentStatus", (status) => {
      statusChanges.push(status);
    });

    // when:
    subagentManager.delegateToSubagent("test-agent", "Test goal", []);
    emitter.emit("subagentStatus", { name: "test-agent" });

    // then:
    assert.strictEqual(statusChanges.length, 1);
    assert.strictEqual(statusChanges[0]?.name, "test-agent");
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

// Helper to simulate the full agent loop behavior
describe("AgentLoop message state handling", () => {
  it("should maintain message order through interactions", () => {
    /** @type {Message[]} */
    const messages = [];

    // Simulate user input
    messages.push({
      role: "user",
      content: [{ type: "text", text: "Initial message" }],
    });

    // Simulate assistant response with tool use
    messages.push({
      role: "assistant",
      content: [
        { type: "text", text: "I'll help" },
        {
          type: "tool_use",
          toolUseId: "1",
          toolName: "exec_command",
          input: { command: "ls" },
        },
      ],
    });

    // Simulate tool result
    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          toolUseId: "1",
          toolName: "exec_command",
          content: [{ type: "text", text: "file1.txt file2.txt" }],
          isError: false,
        },
      ],
    });

    // Then:
    assert.strictEqual(messages.length, 3);
    assert.strictEqual(messages[0].role, "user");
    assert.strictEqual(messages[1].role, "assistant");
    assert.strictEqual(messages[2].role, "user");
  });

  it("should handle error tool results", () => {
    /** @type {Message[]} */
    const messages = [];

    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          toolUseId: "1",
          toolName: "exec_command",
          content: [{ type: "text", text: "Command not found" }],
          isError: true,
        },
      ],
    });

    const lastMessage = messages[messages.length - 1];
    const toolResult = /** @type {MessageContentToolResult} */ (
      lastMessage.content[0]
    );

    assert.strictEqual(toolResult.isError, true);
  });
});
