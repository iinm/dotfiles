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
    description: [
      "Delegate a subtask to a subagent.",
      "The subagent will complete the task and report the result back.",
      "Cannot be called when already acting as a subagent.",
      "Must be called alone - cannot be called with other tools or multiple times at once.",
    ].join("\n"),
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Role or name of the subagent (e.g., 'researcher', 'reviewer').",
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
};
