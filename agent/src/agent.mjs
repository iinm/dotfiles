/**
 * @import { Agent, AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { Message } from "./model"
 * @import { Tool, ToolDefinition } from "./tool"
 * @import { DelegateToSubagentInput } from "./tools/delegateToSubagent.mjs";
 * @import { ReportAsSubagentInput } from "./tools/reportAsSubagent.mjs";
 */

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { createAgentLoop } from "./agentLoop.mjs";
import { MESSAGES_DUMP_FILE_PATH } from "./env.mjs";
import { createSubagentManager } from "./subagentManager.mjs";
import { createToolExecutor } from "./toolExecutor.mjs";
import { createToolInjector } from "./toolInjector.mjs";
import { delegateToSubagentTool } from "./tools/delegateToSubagent.mjs";
import { reportAsSubagentTool } from "./tools/reportAsSubagent.mjs";

/**
 * @param {AgentConfig} config
 * @returns {Agent}
 */
export function createAgent({
  callModel,
  prompt,
  tools,
  toolUseApprover,
  agentRoles,
}) {
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

  const subagentManager = createSubagentManager(agentEventEmitter, agentRoles);

  const toolInjector = createToolInjector();
  toolInjector.register(
    delegateToSubagentTool.def.name,
    (
      tool,
      /** @type {{ subagentManager: import("./subagentManager.mjs").SubagentManager, state: { messages: Message[] } }} */ context,
    ) => ({
      ...tool,
      /**
       * @param {DelegateToSubagentInput} input
       */
      impl: async (input) => {
        const result = context.subagentManager.delegateToSubagent(
          input.name,
          input.goal,
          context.state.messages,
        );
        if (!result.success) {
          return new Error(result.error);
        }
        return result.value;
      },
    }),
  );

  toolInjector.register(
    reportAsSubagentTool.def.name,
    (
      tool,
      /** @type {{ subagentManager: import("./subagentManager.mjs").SubagentManager }} */ context,
    ) => ({
      ...tool,
      /**
       * @param {ReportAsSubagentInput} input
       */
      impl: async (input) => {
        const result = await context.subagentManager.reportAsSubagent(
          input.memoryPath,
        );
        if (!result.success) {
          return new Error(result.error);
        }
        return result.value;
      },
    }),
  );

  const injectedTools = toolInjector.inject(tools, {
    subagentManager,
    state,
  });

  /** @type {Map<string, Tool>} */
  const toolByName = new Map();
  for (const tool of injectedTools) {
    toolByName.set(tool.def.name, tool);
  }

  /** @type {ToolDefinition[]} */
  const toolDefs = injectedTools.map(({ def }) => def);

  const toolExecutor = createToolExecutor(toolByName, {
    exclusiveToolNames: [
      delegateToSubagentTool.def.name,
      reportAsSubagentTool.def.name,
    ],
  });

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
        state.messages = [state.messages[0], ...loadedMessages.slice(1)];
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

  const agentLoop = createAgentLoop({
    callModel,
    state,
    toolDefs,
    toolExecutor,
    agentEventEmitter,
    toolUseApprover,
    subagentManager,
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
