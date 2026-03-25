/**
 * @import { Message, MessageContentToolResult, MessageContentToolUse } from "./model"
 * @import { ReportAsSubagentInput } from "./tools/reportAsSubagent"
 * @import { AgentRole } from "./context/loadAgentRoles.mjs"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "./env.mjs";
import { reportAsSubagentToolName } from "./tools/reportAsSubagent.mjs";

/** @typedef {ReturnType<typeof createSubagentManager>} SubagentManager */

/**
 * @typedef {Object} SubagentStateEventHandlers
 * @property {(subagent: {name:string} | null) => void} onSubagentSwitched
 */

/**
 * Creates a manager for subagent lifecycle and state.
 * @param {Map<string, AgentRole>} agentRoles
 * @param {SubagentStateEventHandlers} handlers
 */
export function createSubagentManager(agentRoles, handlers) {
  /** @type {{name: string; goal: string; delegationMessageIndex: number}[]} */
  const subagents = [];

  /**
   * @typedef {DelegateSuccess | DelegateFailure} DelegateResult
   */

  /**
   * @typedef {Object} DelegateSuccess
   * @property {true} success
   * @property {string} value
   */

  /**
   * @typedef {Object} DelegateFailure
   * @property {false} success
   * @property {string} error
   */

  /**
   * Delegate a task to a subagent.
   * @param {string} name
   * @param {string} goal
   * @param {number} delegationMessageIndex
   * @returns {DelegateResult}
   */
  function delegateToSubagent(name, goal, delegationMessageIndex) {
    if (subagents.length > 0) {
      return {
        success: false,
        error:
          "Cannot call delegate_to_subagent while already acting as a subagent.",
      };
    }

    const isCustomRole = name.startsWith("custom:");
    const actualName = isCustomRole ? name.substring(7) : name;

    let roleContent = "";
    if (!isCustomRole) {
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
      delegationMessageIndex,
    });
    handlers.onSubagentSwitched({ name: actualName });

    return {
      success: true,
      value: [
        `✓ Delegation successful. You are now the subagent "${actualName}".`,
        `Your goal: ${goal}`,
        `Role: ${actualName}\n---\n${roleContent}\n---`,
        `Memory file path format: ${AGENT_PROJECT_METADATA_DIR}/memory/<session-id>--${actualName}--<kebab-case-title>.md (Replace <kebab-case-title> to match the parent task)`,
        `Start working on this goal now. When finished, call "report_as_subagent" with the memory file path.`,
      ].join("\n\n"),
    };
  }

  /**
   * @typedef {ReportSuccess | ReportFailure} ReportResult
   */

  /**
   * @typedef {Object} ReportSuccess
   * @property {true} success
   * @property {string} memoryContent
   */

  /**
   * @typedef {Object} ReportFailure
   * @property {false} success
   * @property {string} error
   */

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
        memoryContent: memoryContent,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read memory file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
      (toolUse) => toolUse.toolName === reportAsSubagentToolName,
    );

    if (reportSubagentToolUse) {
      const reportResult = toolResults.find(
        (res) => res.toolUseId === reportSubagentToolUse.toolUseId,
      );
      if (!reportResult) {
        return { messages, newMessage: null };
      }
      return handleSubagentReport(
        reportSubagentToolUse,
        reportResult,
        messages,
      );
    }

    return { messages, newMessage: null };
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
    if (reportResult.isError) {
      return { messages, newMessage: null };
    }

    const currentSubagent = subagents.pop();
    if (!currentSubagent) {
      return { messages, newMessage: null };
    }

    handlers.onSubagentSwitched(subagents.at(-1) ?? null);

    // Truncate history back to the delegation point
    const truncatedMessages = messages.slice(
      0,
      currentSubagent.delegationMessageIndex,
    );

    // Convert the tool result into a standard user message
    const resultText = reportResult.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n\n");

    const reportInput = /** @type {ReportAsSubagentInput} */ (
      reportToolUse.input
    );

    /** @type {import('./model').UserMessage} */
    const newMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            `The subagent "${currentSubagent.name}" has completed the task.`,
            `Goal: ${currentSubagent.goal}`,
            `Memory file: ${reportInput.memoryPath}`,
            `Result:\n${resultText}`,
          ].join("\n\n"),
        },
      ],
    };

    return { messages: truncatedMessages, newMessage };
  }

  return {
    delegateToSubagent,
    reportAsSubagent,
    processToolResults,
  };
}
