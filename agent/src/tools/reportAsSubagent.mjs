/**
 * @import { Tool, ToolImplementation } from '../tool'
 */

export const reportAsSubagentToolName = "report_as_subagent";

/** @returns {Tool} */
export function createReportAsSubagentTool() {
  /** @type {ToolImplementation} */
  let impl = async () => {
    throw new Error("Not implemented");
  };

  /** @type {Tool} */
  const tool = {
    def: {
      name: reportAsSubagentToolName,
      description:
        "End the subagent role and report the result to the main agent.",
      inputSchema: {
        type: "object",
        properties: {
          memoryPath: {
            type: "string",
            description:
              "Path to the memory file containing the result of the subagent's task.",
          },
        },
        required: ["memoryPath"],
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
