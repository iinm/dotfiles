/**
 * @import { ToolUseApprover, ToolUseApproverConfig } from './tool'
 */

import { matchObject } from "./utils/matchObject.mjs";

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

  /** @type {ToolUseApprover} */
  const approver = (toolUse) => {
    for (const pattern of allowedToolUses) {
      if (matchObject(toolUse, pattern)) {
        return approve();
      }
    }
    return false;
  };

  return approver;
}
