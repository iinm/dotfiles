/**
 * @import { ToolUseApprover, ToolUseApproverConfig, ToolUsePattern } from './tool'
 * @import { MessageContentToolUse } from './model'
 */

import { matchValue } from "./utils/matchValue.mjs";

/**
 * @param {ToolUseApproverConfig} config
 * @returns {ToolUseApprover}
 */
export function createToolUseApprover({ allowedToolUses, maxApproveCount }) {
  let approveCount = 0;

  const approve = () => {
    approveCount += 1;
    if (approveCount <= maxApproveCount) {
      return true;
    }

    approveCount = 0;
    return false;
  };

  /** @type {ToolUsePattern[]} */
  const allowedToolUseInSession = [];

  /**
   * @param {MessageContentToolUse} toolUse
   */
  const isAllowedToolUse = (toolUse) => {
    for (const pattern of [...allowedToolUses, ...allowedToolUseInSession]) {
      if (matchValue(toolUse, pattern)) {
        return approve();
      }
    }
    return false;
  };

  /**
   * @param {MessageContentToolUse} toolUse
   */
  const allowToolUse = (toolUse) => {
    allowedToolUseInSession.push({
      toolName: toolUse.toolName,
      input: toolUse.input,
    });
  };

  return {
    isAllowedToolUse,
    allowToolUse,
  };
}
