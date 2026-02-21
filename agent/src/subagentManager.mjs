/**
 * @import { AgentEventEmitter } from "./agent"
 * @import { Message, MessageContentToolResult, MessageContentToolUse } from "./model"
 * @import { ReportAsSubagentInput } from "./tools/reportAsSubagent.mjs";
 * @import { AgentRole } from "./utils/loadAgentRoles.mjs";
 */

import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "./env.mjs";
import { reportAsSubagentTool } from "./tools/reportAsSubagent.mjs";

/**
 * @typedef {Object} SubagentState
 * @property {string} name
 * @property {string} goal
 * @property {number} delegateResultMessageIndex
 */

/**
 * @typedef {Object} DelegateSuccess
 * @property {true} success
 * @property {string} value - 成功時のメッセージ
 */

/**
 * @typedef {Object} DelegateFailure
 * @property {false} success
 * @property {string} error - エラーメッセージ
 */

/**
 * @typedef {DelegateSuccess | DelegateFailure} DelegateResult
 */

/**
 * @typedef {Object} ReportSuccess
 * @property {true} success
 * @property {string} value - メモリファイルの内容
 */

/**
 * @typedef {Object} ReportFailure
 * @property {false} success
 * @property {string} error - エラーメッセージ
 */

/**
 * @typedef {ReportSuccess | ReportFailure} ReportResult
 */

/**
 * @typedef {Object} SubagentManagerState
 * @property {SubagentState | null} current - Current active subagent
 * @property {number} count - Number of active subagents
 * @property {boolean} isActive - Whether currently in subagent mode
 */

/**
 * @typedef {Object} SubagentManager
 * @property {() => SubagentManagerState} getState
 * @property {(toolUseParts: MessageContentToolUse[], toolResults: MessageContentToolResult[], messages: Message[]) => { messages: Message[], newMessage: Message | null }} processToolResults
 * @property {(name: string, goal: string, messages: Message[]) => DelegateResult} delegateToSubagent
 * @property {(memoryPath: string) => Promise<ReportResult>} reportAsSubagent
 */

/**
 * Creates a manager for subagent lifecycle and state.
 * @param {AgentEventEmitter} agentEventEmitter
 * @param {Map<string, AgentRole>} agentRoles
 * @returns {SubagentManager}
 */
export function createSubagentManager(agentEventEmitter, agentRoles) {
  /** @type {SubagentState[]} */
  const subagents = [];

  /**
   * Get the combined state of the subagent manager.
   * This method provides a unified interface to query subagent state.
   *
   * @returns {SubagentManagerState} Combined subagent state
   */
  function getState() {
    return {
      current: subagents.at(-1) ?? null,
      count: subagents.length,
      isActive: subagents.length > 0,
    };
  }

  /**
   * Handle the result of a subagent reporting back.
   * On success, truncates conversation history back to the delegation point
   * and converts the report into a standard user message.
   * @param {MessageContentToolUse} reportToolUse
   * @param {MessageContentToolResult} reportResult
   * @param {Message[]} messages
   * @returns {{ messages: Message[], newMessage: Message | null }}
   *   - messages: The truncated message history (new array)
   *   - newMessage: The user message to add, or null if not handled
   */
  function handleSubagentReport(reportToolUse, reportResult, messages) {
    if (reportResult?.isError) {
      return { messages, newMessage: null };
    }

    const currentSubagent = subagents.pop();
    if (!currentSubagent) {
      // Fallback if state is out of sync
      return { messages, newMessage: null };
    }

    // Truncate history back to before the delegation point
    // The -1 ensures the delegation result message itself is not included,
    // as it will be replaced by the subagent's report message
    const truncatedMessages = messages.slice(
      0,
      currentSubagent.delegateResultMessageIndex - 1,
    );

    agentEventEmitter.emit(
      "subagentStatus",
      subagents.length > 0 ? (subagents.at(-1) ?? null) : null,
    );

    // Convert the tool result into a standard user message
    const resultText = reportResult?.content
      ?.map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");

    // Get memory path from the report tool input
    const reportInput = /** @type {ReportAsSubagentInput} */ (
      reportToolUse.input
    );
    const memoryPathText = reportInput.memoryPath
      ? `\n\nMemory file: ${reportInput.memoryPath}`
      : "";

    /** @type {import('./model').UserMessage} */
    const newMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: `The subagent "${currentSubagent.name}" has completed the task.\n\nOriginal goal: ${currentSubagent.goal}${memoryPathText}\n\nResult:\n${resultText}`,
        },
      ],
    };

    return { messages: truncatedMessages, newMessage };
  }

  /**
   * Process tool results and update state based on special tools.
   * Returns the truncated message history and a new message to add.
   * @param {MessageContentToolUse[]} toolUseParts
   * @param {MessageContentToolResult[]} toolResults
   * @param {Message[]} messages
   * @returns {{ messages: Message[], newMessage: Message | null }}
   *   - messages: The potentially truncated message history (new array)
   *   - newMessage: The user message to add, or null if tool results should be added directly
   */
  function processToolResults(toolUseParts, toolResults, messages) {
    const reportSubagentToolUse = toolUseParts.find(
      (toolUse) => toolUse.toolName === reportAsSubagentTool.def.name,
    );

    if (reportSubagentToolUse) {
      const reportResult = toolResults.find(
        (res) => res.toolUseId === reportSubagentToolUse.toolUseId,
      );
      if (!reportResult) {
        return { messages, newMessage: null };
      }
      const result = handleSubagentReport(
        reportSubagentToolUse,
        reportResult,
        messages,
      );
      return result;
    }

    return { messages, newMessage: null };
  }

  /**
   * Delegate a task to a subagent.
   * @param {string} name
   * @param {string} goal
   * @param {Message[]} messages - Current message history (for tracking delegation point)
   * @returns {DelegateResult}
   */
  function delegateToSubagent(name, goal, messages) {
    if (subagents.length > 0) {
      return {
        success: false,
        error:
          "Cannot call delegate_to_subagent while already acting as a subagent.",
      };
    }

    // Check if it's a custom (ad-hoc) role
    const isCustomRole = name.startsWith("custom:");
    const actualName = isCustomRole ? name.substring(7) : name;

    let roleContent = "";
    if (!isCustomRole) {
      // Look for agent role
      const role = agentRoles.get(name);
      if (!role) {
        const availableRoles = Array.from(agentRoles.keys())
          .sort()
          .map((id) => `  - ${id}`)
          .join("\n");
        return {
          success: false,
          error: `Agent role "${name}" not found. Available agent roles:\n${availableRoles}\n\nTo use an ad-hoc role, prefix the name with "custom:" (e.g., "custom:researcher").`,
        };
      }
      roleContent = role.content;
    }

    subagents.push({
      name: actualName,
      goal,
      delegateResultMessageIndex: messages.length,
    });

    agentEventEmitter.emit("subagentStatus", { name: actualName });

    const roleSection = roleContent
      ? `\n\nRole: ${name}\n---\n${roleContent}\n---`
      : "";

    const value =
      `✓ Delegation successful. You are now the subagent "${actualName}".\n\n` +
      `Your goal: ${goal}${roleSection}\n\n` +
      `Memory file path format: ${AGENT_PROJECT_METADATA_DIR}/memory/<session-id>--${actualName}--<kebab-case-title>.md (Replace <kebab-case-title> to match the parent task)\n\n` +
      `Start working on this goal now. When finished, call "report_as_subagent" with the memory file path.`;

    return {
      success: true,
      value,
    };
  }

  /**
   * Report as a subagent and read the memory file.
   * @param {string} memoryPath
   * @returns {Promise<ReportResult>}
   */
  async function reportAsSubagent(memoryPath) {
    if (subagents.length === 0) {
      return {
        success: false,
        error: "Cannot call report_as_subagent from the main agent.",
      };
    }

    const absolutePath = path.resolve(memoryPath);
    const memoryDir = path.resolve(AGENT_PROJECT_METADATA_DIR, "memory");
    const relativePath = path.relative(memoryDir, absolutePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return {
        success: false,
        error: `Access denied: memoryPath must be within ${AGENT_PROJECT_METADATA_DIR}/memory`,
      };
    }

    try {
      const memoryContent = await fs.readFile(absolutePath, {
        encoding: "utf-8",
      });
      return {
        success: true,
        value: memoryContent,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read memory file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  return {
    getState,
    processToolResults,
    delegateToSubagent,
    reportAsSubagent,
  };
}
