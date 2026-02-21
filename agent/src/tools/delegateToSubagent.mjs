/**
 * @import { Tool } from '../tool'
 */

/**
 * @typedef {Object} DelegateToSubagentInput
 * @property {string} name
 * @property {string} goal
 */

/** @type {Tool} */
export const delegateToSubagentTool = {
  def: {
    name: "delegate_to_subagent",
    description: "Delegate a subtask to a subagent.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Role or name of the subagent (e.g., 'researcher', 'analyzer', 'architect', 'planner', 'implementer', 'tester', 'debugger', 'reviewer', 'refactorer').",
        },
        goal: {
          type: "string",
          description: "The goal or task for the subagent to achieve.",
        },
      },
      required: ["name", "goal"],
    },
  },
  // Implementation will be injected by the agent to access its state
  impl: async () => {
    throw new Error("Not implemented");
  },

  /**
   * @param {Record<string, unknown>} input
   * @returns {Record<string, unknown>}
   */
  maskApprovalInput: (input) => {
    const delegateToSubagentInput = /** @type {DelegateToSubagentInput} */ (
      input
    );
    return {
      name: delegateToSubagentInput.name,
    };
  },
};
