/**
 * @import { ToolUseApprover, ToolUseApproverConfig, ToolUseDecision, ToolUsePattern } from './tool'
 * @import { MessageContentToolUse } from './model'
 */

import { isSafeToolInput } from "./utils/isSafeToolInput.mjs";
import { matchValue } from "./utils/matchValue.mjs";

/**
 * @param {ToolUseApproverConfig} config
 * @returns {ToolUseApprover}
 */
export function createToolUseApprover({
  patterns,
  maxApprovals: max,
  maskApprovalInput,
}) {
  const state = {
    approvalCount: 0,
    /** @type {ToolUsePattern[]} */
    allowedToolUseInSession: [],
  };

  /** @returns {void} */
  function resetApprovalCount() {
    state.approvalCount = 0;
  }

  /**
   * @param {MessageContentToolUse} toolUse
   * @returns {ToolUseDecision}
   */
  function isAllowedToolUse(toolUse) {
    const toolUseToMatch = {
      toolName: toolUse.toolName,
      input: toolUse.input,
    };

    for (const pattern of [...patterns, ...state.allowedToolUseInSession]) {
      const patternToMatch = {
        toolName: pattern.toolName,
        ...(pattern.input !== undefined && { input: pattern.input }),
      };

      if (!matchValue(toolUseToMatch, patternToMatch)) {
        continue;
      }

      const action = pattern.action ?? "ask";

      if (action === "deny") {
        return {
          action: "deny",
          reason: pattern.reason,
        };
      }

      if (action === "allow") {
        const maskedInput = maskApprovalInput(toolUse.toolName, toolUse.input);
        if (isSafeToolInput(maskedInput)) {
          state.approvalCount += 1;
          return state.approvalCount <= max
            ? { action: "allow" }
            : { action: "ask" };
        }
      }

      return { action: "ask" };
    }

    return { action: "ask" };
  }

  /**
   * @param {MessageContentToolUse} toolUse
   * @returns {void}
   */
  function allowToolUse(toolUse) {
    state.allowedToolUseInSession.push({
      toolName: toolUse.toolName,
      input: maskApprovalInput(toolUse.toolName, toolUse.input),
      action: "allow",
    });
  }

  return {
    isAllowedToolUse,
    allowToolUse,
    resetApprovalCount,
  };
}
