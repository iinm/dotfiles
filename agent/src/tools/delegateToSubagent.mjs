/**
 * @import { Tool, ToolImplementation } from '../tool'
 */

export const delegateToSubagentToolName = "delegate_to_subagent";

/** @returns {Tool} */
export function createDelegateToSubagentTool() {
  /** @type {ToolImplementation} */
  let impl = async () => {
    throw new Error("Not implemented");
  };

  /** @type {Tool} */
  const tool = {
    def: {
      name: delegateToSubagentToolName,
      description:
        "Delegate a subtask to a subagent. You inherit the current context and work on the delegated goal.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Role or name of the subagent. Use 'custom:' prefix for ad-hoc roles.",
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
    get impl() {
      return impl;
    },

    injectImpl(fn) {
      impl = fn;
    },
  };

  return tool;
}
