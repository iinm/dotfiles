/**
 * @import { ToolUseApprover, ToolUseApproverConfig, ToolUsePattern } from './tool'
 * @import { MessageContentToolUse } from './model'
 */

import { matchValue } from "./utils/matchValue.mjs";

/**
 * @param {ToolUseApproverConfig} config
 * @returns {ToolUseApprover}
 */
export function createToolUseApprover({
  allowedToolUses,
  maxAutoApprovals,
  maskAllowedInput,
}) {
  const state = {
    approveCount: 0,
    /** @type {ToolUsePattern[]} */
    allowedToolUseInSession: [],
  };

  const approve = () => {
    state.approveCount += 1;
    if (state.approveCount <= maxAutoApprovals) {
      return true;
    }

    state.approveCount = 0;
    return false;
  };

  const reject = () => {
    state.approveCount = 0;
    return false;
  };

  /**
   * @param {MessageContentToolUse} toolUse
   */
  const isAllowedToolUse = (toolUse) => {
    for (const pattern of [
      ...allowedToolUses,
      ...state.allowedToolUseInSession,
    ]) {
      if (matchValue(toolUse, pattern)) {
        return approve();
      }
    }
    return reject();
  };

  /**
   * @param {MessageContentToolUse} toolUse
   */
  const allowToolUse = (toolUse) => {
    state.allowedToolUseInSession.push({
      toolName: toolUse.toolName,
      input: maskAllowedInput(toolUse.toolName, toolUse.input),
    });
  };

  return {
    isAllowedToolUse,
    allowToolUse,
  };
}
