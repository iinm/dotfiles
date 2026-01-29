/**
 * @import { ToolUseApprover, ToolUseApproverConfig, ToolUsePattern } from './tool'
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

  const resetApprovalCount = () => {
    state.approvalCount = 0;
  };

  /**
   * @param {MessageContentToolUse} toolUse
   */
  const isAllowedToolUse = (toolUse) => {
    for (const pattern of [...patterns, ...state.allowedToolUseInSession]) {
      if (
        matchValue(toolUse, pattern) &&
        isSafeToolInput(maskApprovalInput(toolUse.toolName, toolUse.input))
      ) {
        state.approvalCount += 1;
        return state.approvalCount <= max;
      }
    }
    return false;
  };

  /**
   * @param {MessageContentToolUse} toolUse
   */
  const allowToolUse = (toolUse) => {
    state.allowedToolUseInSession.push({
      toolName: toolUse.toolName,
      input: maskApprovalInput(toolUse.toolName, toolUse.input),
    });
  };

  return {
    isAllowedToolUse,
    allowToolUse,
    resetApprovalCount,
  };
}
