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
import { noThrow } from "./utils/noThrow.mjs";

/**
 * @typedef {Object} SubagentState
 * @property {string} name
 * @property {string} goal
 * @property {number} delegateResultMessageIndex
 */

/**
 * @typedef {Object} DelegateResult
 * @property {true} success
 * @property {string} message
 */

/**
 * @typedef {Object} DelegateError
 * @property {false} success
 * @property {string} error
 */

/**
 * @typedef {Object} SubagentManager
 * @property {() => SubagentState | null} getCurrentSubagent
 * @property {() => number} getSubagentCount
 * @property {() => boolean} isInSubagentMode
 * @property {(toolUseParts: MessageContentToolUse[], toolResults: MessageContentToolResult[], messages: Message[]) => Message | null} processToolResults
 * @property {(name: string, goal: string, messages: Message[]) => DelegateResult | DelegateError} delegateToSubagent
 * @property {(memoryPath: string) => Promise<string | Error>} reportAsSubagent
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
   * Get the current active subagent (the most recent one).
   * @returns {SubagentState | null}
   */
  function getCurrentSubagent() {
    return subagents.length > 0 ? (subagents.at(-1) ?? null) : null;
  }

  /**
   * Get the number of active subagents.
   * @returns {number}
   */
  function getSubagentCount() {
    return subagents.length;
  }

  /**
   * Check if currently acting as a subagent.
   * @returns {boolean}
   */
  function isInSubagentMode() {
    return subagents.length > 0;
  }

  /**
   * Truncate message history back to before the delegation point.
   * @param {Message[]} messages
   * @param {number} delegateResultMessageIndex
   */
  function truncateHistory(messages, delegateResultMessageIndex) {
    messages.splice(
      delegateResultMessageIndex - 1,
      messages.length - (delegateResultMessageIndex - 1),
    );
  }

  /**
   * Handle the result of a subagent reporting back.
   * On success, truncates conversation history back to the delegation point
   * and converts the report into a standard user message.
   * @param {MessageContentToolUse} reportToolUse
   * @param {MessageContentToolResult} reportResult
   * @param {Message[]} messages
   * @returns {Message | null} The user message to add, or null if not handled
   */
  function handleSubagentReport(reportToolUse, reportResult, messages) {
    if (reportResult?.isError) {
      return null;
    }

    const currentSubagent = subagents.pop();
    if (!currentSubagent) {
      // Fallback if state is out of sync
      return null;
    }

    // Truncate history back to before the delegation point
    truncateHistory(messages, currentSubagent.delegateResultMessageIndex);

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

    return {
      role: "user",
      content: [
        {
          type: "text",
          text: `The subagent "${currentSubagent.name}" has completed the task.\n\nOriginal goal: ${currentSubagent.goal}${memoryPathText}\n\nResult:\n${resultText}`,
        },
      ],
    };
  }

  /**
   * Process tool results and update state based on special tools.
   * @param {MessageContentToolUse[]} toolUseParts
   * @param {MessageContentToolResult[]} toolResults
   * @param {Message[]} messages
   * @returns {Message | null} The user message to add, or null if tool results should be added directly
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
        return null;
      }
      const userMessage = handleSubagentReport(
        reportSubagentToolUse,
        reportResult,
        messages,
      );
      return userMessage;
    }

    return null;
  }

  /**
   * Delegate a task to a subagent.
   * @param {string} name
   * @param {string} goal
   * @param {Message[]} messages - Current message history (for tracking delegation point)
   * @returns {DelegateResult | DelegateError}
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
      // Look for preset role
      const role = agentRoles.get(name);
      if (!role) {
        const availableRoles = Array.from(agentRoles.keys())
          .sort()
          .map((id) => `  - ${id}`)
          .join("\n");
        return {
          success: false,
          error: `Preset role "${name}" not found. Available preset roles:\n${availableRoles}\n\nTo use an ad-hoc role, prefix the name with "custom:" (e.g., "custom:researcher").`,
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

    const messageParts = [
      `✓ Delegation successful. You are now the subagent "${actualName}".`,
      "",
      `Your goal: ${goal}`,
    ];

    if (roleContent) {
      messageParts.push("", `Role: ${name}`, "---", roleContent, "---");
    }

    messageParts.push(
      "",
      `Memory file path format: ${AGENT_PROJECT_METADATA_DIR}/memory/<session-id>--${actualName}--<kebab-case-title>.md (Replace <kebab-case-title> to match the parent task)`,
      "",
      `Start working on this goal now. When finished, call "report_as_subagent" with the memory file path.`,
    );

    return {
      success: true,
      message: messageParts.join("\n"),
    };
  }

  /**
   * Report as a subagent and read the memory file.
   * @param {string} memoryPath
   * @returns {Promise<string | Error>}
   */
  async function reportAsSubagent(memoryPath) {
    return noThrow(async () => {
      if (subagents.length === 0) {
        return new Error("Cannot call report_as_subagent from the main agent.");
      }

      const workingDir = process.cwd();
      const absolutePath = path.resolve(memoryPath);
      const relativePath = path.relative(workingDir, absolutePath);
      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return new Error(
          "Access denied: memoryPath must be within the working directory",
        );
      }

      let memoryContent;
      try {
        memoryContent = await fs.readFile(absolutePath, {
          encoding: "utf-8",
        });
      } catch (error) {
        return new Error(
          `Failed to read memory file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return memoryContent;
    });
  }

  return {
    getCurrentSubagent,
    getSubagentCount,
    isInSubagentMode,
    processToolResults,
    delegateToSubagent,
    reportAsSubagent,
  };
}
