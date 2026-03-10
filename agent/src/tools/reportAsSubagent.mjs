/**
 * @import { Tool } from '../tool'
 * @import { ReportAsSubagentInput } from './reportAsSubagent'
 */

/** @type {Tool} */
export const reportAsSubagentTool = {
  def: {
    name: "report_as_subagent",
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
  impl: async () => {
    throw new Error("Not implemented");
  },
};
