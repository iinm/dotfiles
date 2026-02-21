/**
 * @import { Message, MessageContentToolResult, MessageContentToolUse } from "./model"
 */

import assert from "node:assert";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { createSubagentManager } from "./subagentManager.mjs";

describe("createSubagentManager", () => {
  /** @returns {import("./agent").AgentEventEmitter} */
  function createMockEventEmitter() {
    return /** @type {any} */ (new EventEmitter());
  }

  describe("getCurrentSubagent", () => {
    it("should return null when no subagent is active", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());

      // when:
      const result = manager.getCurrentSubagent();

      // then:
      assert.strictEqual(result, null);
    });

    it("should return the current subagent after delegation", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];

      // when:
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);
      const result = manager.getCurrentSubagent();

      // then:
      assert.ok(result);
      assert.strictEqual(result?.name, "test-agent");
      assert.strictEqual(result?.goal, "Test goal");
    });
  });

  describe("getSubagentCount", () => {
    it("should return 0 initially", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());

      // when:
      const result = manager.getSubagentCount();

      // then:
      assert.strictEqual(result, 0);
    });

    it("should return 1 after delegation", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];

      // when:
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);
      const result = manager.getSubagentCount();

      // then:
      assert.strictEqual(result, 1);
    });
  });

  describe("isInSubagentMode", () => {
    it("should return false initially", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());

      // when:
      const result = manager.isInSubagentMode();

      // then:
      assert.strictEqual(result, false);
    });

    it("should return true after delegation", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];

      // when:
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);
      const result = manager.isInSubagentMode();

      // then:
      assert.strictEqual(result, true);
    });
  });

  describe("delegateToSubagent", () => {
    it("should return success for valid delegation", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];

      // when:
      const result = manager.delegateToSubagent(
        "custom:test-agent",
        "Test goal",
        messages,
      );

      // then:
      assert.strictEqual(result.success, true);
      assert.ok(result.message.includes("test-agent"));
      assert.ok(result.message.includes("Test goal"));
    });

    it("should return error when already in subagent mode", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];
      manager.delegateToSubagent("custom:first-agent", "First goal", messages);

      // when:
      const result = manager.delegateToSubagent(
        "custom:second-agent",
        "Second goal",
        messages,
      );

      // then:
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes("Cannot call delegate_to_subagent"));
    });

    it("should emit subagentStatus event", () => {
      // given:
      const emitter = createMockEventEmitter();
      /** @type {any[]} */
      const emittedStatuses = [];
      emitter.on("subagentStatus", (status) => {
        emittedStatuses.push(status);
      });
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];

      // when:
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);

      // then:
      assert.strictEqual(emittedStatuses.length, 1);
      assert.strictEqual(emittedStatuses[0]?.name, "test-agent");
    });
  });

  describe("processToolResults", () => {
    it("should return null when no report_as_subagent tool use", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);

      /** @type {MessageContentToolUse[]} */
      const toolUseParts = [
        {
          type: "tool_use",
          toolUseId: "1",
          toolName: "exec_command",
          input: {},
        },
      ];
      /** @type {MessageContentToolResult[]} */
      const toolResults = [
        {
          type: "tool_result",
          toolUseId: "1",
          toolName: "exec_command",
          content: [{ type: "text", text: "output" }],
          isError: false,
        },
      ];

      // when:
      const result = manager.processToolResults(
        toolUseParts,
        toolResults,
        messages,
      );

      // then:
      assert.strictEqual(result, null);
    });

    it("should return null when report result has error", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);

      /** @type {MessageContentToolUse[]} */
      const toolUseParts = [
        {
          type: "tool_use",
          toolUseId: "1",
          toolName: "report_as_subagent",
          input: { memoryPath: ".agent/memory/test.md" },
        },
      ];
      /** @type {MessageContentToolResult[]} */
      const toolResults = [
        {
          type: "tool_result",
          toolUseId: "1",
          toolName: "report_as_subagent",
          content: [{ type: "text", text: "error" }],
          isError: true,
        },
      ];

      // when:
      const result = manager.processToolResults(
        toolUseParts,
        toolResults,
        messages,
      );

      // then:
      assert.strictEqual(result, null);
    });

    it("should handle successful report and truncate history", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [
        { role: "user", content: [{ type: "text", text: "Initial" }] },
        { role: "assistant", content: [{ type: "text", text: "Response" }] },
      ];
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);
      const initialLength = messages.length;

      /** @type {MessageContentToolUse[]} */
      const toolUseParts = [
        {
          type: "tool_use",
          toolUseId: "1",
          toolName: "report_as_subagent",
          input: { memoryPath: ".agent/memory/test.md" },
        },
      ];
      /** @type {MessageContentToolResult[]} */
      const toolResults = [
        {
          type: "tool_result",
          toolUseId: "1",
          toolName: "report_as_subagent",
          content: [{ type: "text", text: "Task completed successfully" }],
          isError: false,
        },
      ];

      // when:
      const result = manager.processToolResults(
        toolUseParts,
        toolResults,
        messages,
      );

      // then:
      assert.ok(result);
      assert.strictEqual(result?.role, "user");
      assert.ok(result?.content[0].type === "text");
      assert.ok(result?.content[0].text?.includes("test-agent"));
      assert.ok(result?.content[0].text?.includes("Test goal"));
      assert.ok(
        result?.content[0].text?.includes("Task completed successfully"),
      );
      assert.ok(messages.length < initialLength, "History should be truncated");
    });

    it("should emit subagentStatus event after report", () => {
      // given:
      const emitter = createMockEventEmitter();
      /** @type {any[]} */
      const emittedStatuses = [];
      emitter.on("subagentStatus", (status) => {
        emittedStatuses.push(status);
      });
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);

      /** @type {MessageContentToolUse[]} */
      const toolUseParts = [
        {
          type: "tool_use",
          toolUseId: "1",
          toolName: "report_as_subagent",
          input: { memoryPath: ".agent/memory/test.md" },
        },
      ];
      /** @type {MessageContentToolResult[]} */
      const toolResults = [
        {
          type: "tool_result",
          toolUseId: "1",
          toolName: "report_as_subagent",
          content: [{ type: "text", text: "Done" }],
          isError: false,
        },
      ];

      // when:
      manager.processToolResults(toolUseParts, toolResults, messages);

      // then:
      assert.strictEqual(emittedStatuses.length, 2);
      assert.strictEqual(emittedStatuses[0]?.name, "test-agent");
      assert.strictEqual(emittedStatuses[1], null);
    });
  });

  describe("reportAsSubagent", () => {
    it("should return error when not in subagent mode", async () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());

      // when:
      const result = await manager.reportAsSubagent(".agent/memory/test.md");

      // then:
      assert.ok(result instanceof Error);
      assert.ok(result.message.includes("Cannot call report_as_subagent"));
    });

    it("should return error for path outside working directory", async () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);

      // when:
      const result = await manager.reportAsSubagent("/etc/passwd");

      // then:
      assert.ok(result instanceof Error);
      assert.ok(result.message.includes("Access denied"));
    });

    it("should return error for non-existent file", async () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [];
      manager.delegateToSubagent("custom:test-agent", "Test goal", messages);

      // when:
      const result = await manager.reportAsSubagent(
        ".agent/memory/non-existent-file.md",
      );

      // then:
      assert.ok(result instanceof Error);
      assert.ok(result.message.includes("Failed to read memory file"));
    });
  });

  describe("integration", () => {
    it("should handle full delegation and report cycle", () => {
      // given:
      const emitter = createMockEventEmitter();
      const manager = createSubagentManager(emitter, new Map());
      /** @type {Message[]} */
      const messages = [
        { role: "user", content: [{ type: "text", text: "Start" }] },
      ];

      // when - delegate:
      const delegateResult = manager.delegateToSubagent(
        "custom:worker",
        "Do work",
        messages,
      );
      assert.strictEqual(delegateResult.success, true);
      assert.strictEqual(manager.isInSubagentMode(), true);

      // when - report:
      /** @type {MessageContentToolUse[]} */
      const toolUseParts = [
        {
          type: "tool_use",
          toolUseId: "1",
          toolName: "report_as_subagent",
          input: { memoryPath: ".agent/memory/test.md" },
        },
      ];
      /** @type {MessageContentToolResult[]} */
      const toolResults = [
        {
          type: "tool_result",
          toolUseId: "1",
          toolName: "report_as_subagent",
          content: [{ type: "text", text: "Work done" }],
          isError: false,
        },
      ];
      const reportMessage = manager.processToolResults(
        toolUseParts,
        toolResults,
        messages,
      );

      // then:
      assert.ok(reportMessage);
      assert.strictEqual(manager.isInSubagentMode(), false);
      assert.strictEqual(manager.getSubagentCount(), 0);
    });
  });
});
