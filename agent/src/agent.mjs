/**
 * @import { Agent, AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { Message, MessageContentToolResult, MessageContentToolUse } from "./model"
 * @import { Tool, ToolDefinition } from "./tool"
 * @import { DelegateToSubagentInput } from "./tools/delegateToSubagent.mjs";
 * @import { ReportAsSubagentInput } from "./tools/reportAsSubagent.mjs";
 */

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { createAgentLoop } from "./agentLoop.mjs";
import { MESSAGES_DUMP_FILE_PATH } from "./env.mjs";
import { createSubagentManager } from "./subagentManager.mjs";
import { delegateToSubagentTool } from "./tools/delegateToSubagent.mjs";
import { reportAsSubagentTool } from "./tools/reportAsSubagent.mjs";

/**
 * @param {AgentConfig} config
 * @returns {Agent}
 */
export function createAgent({ callModel, prompt, tools, toolUseApprover }) {
  /** @type {{ messages: Message[] }} */
  const state = {
    messages: [
      {
        role: "system",
        content: [{ type: "text", text: prompt }],
      },
    ],
  };

  /** @type {UserEventEmitter} */
  const userEventEmitter = new EventEmitter();
  /** @type {AgentEventEmitter} */
  const agentEventEmitter = new EventEmitter();

  // Initialize subagent manager
  const subagentManager = createSubagentManager(agentEventEmitter);

  // Inject delegate/report tool implementations that require access to the agent state
  const injectedTools = tools.map((tool) => {
    if (tool.def.name === delegateToSubagentTool.def.name) {
      return {
        ...tool,
        /**
         * @param {DelegateToSubagentInput} input
         */
        impl: async (input) => {
          const result = subagentManager.delegateToSubagent(
            input.name,
            input.goal,
            state.messages,
          );
          if (!result.success) {
            return new Error(result.error);
          }
          return result.message;
        },
      };
    }

    if (tool.def.name === reportAsSubagentTool.def.name) {
      return {
        ...tool,
        /**
         * @param {ReportAsSubagentInput} input
         */
        impl: async (input) =>
          subagentManager.reportAsSubagent(input.memoryPath),
      };
    }

    return tool;
  });

  /** @type {Map<string, Tool>} */
  const toolByName = new Map();
  for (const tool of injectedTools) {
    toolByName.set(tool.def.name, tool);
  }

  /** @type {ToolDefinition[]} */
  const toolDefs = injectedTools.map(({ def }) => def);

  async function dumpMessages() {
    const filePath = MESSAGES_DUMP_FILE_PATH;
    try {
      await fs.writeFile(filePath, JSON.stringify(state.messages, null, 2));
      console.log(`Messages dumped to ${filePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error dumping messages: ${message}`);
    }
  }

  async function loadMessages() {
    const filePath = MESSAGES_DUMP_FILE_PATH;
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const loadedMessages = JSON.parse(data);
      if (Array.isArray(loadedMessages)) {
        // Keep the system message (index 0) and replace the rest
        state.messages.splice(
          1,
          state.messages.length - 1,
          ...loadedMessages.slice(1),
        );
        console.log(`Messages loaded from ${filePath}`);
      } else {
        console.error("Error loading messages: Invalid format in file.");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error loading messages: ${error.message}`);
      }
    }
  }

  // Initialize agent loop
  const agentLoop = createAgentLoop({
    callModel,
    state,
    toolDefs,
    toolByName,
    agentEventEmitter,
    toolUseApprover,
    subagentManager,
    callTool,
  });

  userEventEmitter.on("userInput", agentLoop.handleUserInput);

  return {
    userEventEmitter,
    agentEventEmitter,
    agentCommands: {
      dumpMessages,
      loadMessages,
    },
  };
}

/**
 * @param {MessageContentToolUse} toolUse
 * @param {Map<string, Tool>} toolByName
 * @returns {Promise<MessageContentToolResult>}
 */
async function callTool(toolUse, toolByName) {
  const tool = toolByName.get(toolUse.toolName);
  if (!tool) {
    return {
      type: "tool_result",
      toolUseId: toolUse.toolUseId,
      toolName: toolUse.toolName,
      content: [{ type: "text", text: `Tool not found: ${toolUse.toolName}` }],
      isError: true,
    };
  }

  if (tool.validateInput) {
    const validateInputResult = tool.validateInput(toolUse.input);
    if (validateInputResult instanceof Error) {
      return {
        type: "tool_result",
        toolUseId: toolUse.toolUseId,
        toolName: toolUse.toolName,
        content: [{ type: "text", text: validateInputResult.message }],
        isError: true,
      };
    }
  }

  const result = await tool.impl(toolUse.input);
  if (result instanceof Error) {
    return {
      type: "tool_result",
      toolUseId: toolUse.toolUseId,
      toolName: toolUse.toolName,
      content: [{ type: "text", text: result.message }],
      isError: true,
    };
  }

  if (typeof result === "string") {
    return {
      type: "tool_result",
      toolUseId: toolUse.toolUseId,
      toolName: toolUse.toolName,
      content: [{ type: "text", text: result }],
    };
  }

  return {
    type: "tool_result",
    toolUseId: toolUse.toolUseId,
    toolName: toolUse.toolName,
    content: result,
  };
}
