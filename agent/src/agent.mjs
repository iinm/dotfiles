/**
 * @import { Agent, AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { Tool, ToolDefinition } from "./tool"
 * @import { DelegateToSubagentInput } from "./tools/delegateToSubagent"
 * @import { ReportAsSubagentInput } from "./tools/reportAsSubagent"
 */

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { createAgentLoop } from "./agentLoop.mjs";
import { createStateManager } from "./agentState.mjs";
import { MESSAGES_DUMP_FILE_PATH } from "./env.mjs";
import { createSubagentManager } from "./subagent.mjs";
import { createToolExecutor } from "./toolExecutor.mjs";
import { delegateToSubagentToolName } from "./tools/delegateToSubagent.mjs";
import { reportAsSubagentToolName } from "./tools/reportAsSubagent.mjs";

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
  /** @type {UserEventEmitter} */
  const userEventEmitter = new EventEmitter();
  /** @type {AgentEventEmitter} */
  const agentEventEmitter = new EventEmitter();

  const stateManager = createStateManager(
    [
      {
        role: "system",
        content: [{ type: "text", text: prompt }],
      },
    ],
    {
      onMessagesAppended: (newMessages) => {
        const lastMessage = newMessages.at(-1);
        if (!lastMessage) {
          return;
        }
        agentEventEmitter.emit("message", lastMessage);
      },
    },
  );

  const subagentManager = createSubagentManager(agentRoles, {
    onSubagentSwitched: (subagent) => {
      agentEventEmitter.emit("subagentSwitched", subagent);
    },
  });

  /**
   * @param {DelegateToSubagentInput} input
   */
  const delegateToSubagentImpl = async (input) => {
    const result = subagentManager.delegateToSubagent(
      input.name,
      input.goal,
      stateManager.getMessages().length - 1,
    );
    if (!result.success) {
      return new Error(result.error);
    }
    return result.value;
  };

  /**
   * @param {ReportAsSubagentInput} input
   */
  const reportAsSubagentImpl = async (input) => {
    const result = await subagentManager.reportAsSubagent(input.memoryPath);
    if (!result.success) {
      return new Error(result.error);
    }
    return result.memoryContent;
  };

  /** @type {Map<string, Tool>} */
  const toolByName = new Map();
  for (const tool of tools) {
    if (tool.def.name === delegateToSubagentToolName && tool.injectImpl) {
      tool.injectImpl(delegateToSubagentImpl);
    }
    if (tool.def.name === reportAsSubagentToolName && tool.injectImpl) {
      tool.injectImpl(reportAsSubagentImpl);
    }
    toolByName.set(tool.def.name, tool);
  }

  /** @type {ToolDefinition[]} */
  const toolDefs = tools.map(({ def }) => def);

  const toolExecutor = createToolExecutor(toolByName, {
    exclusiveToolNames: [delegateToSubagentToolName, reportAsSubagentToolName],
  });

  async function dumpMessages() {
    const filePath = MESSAGES_DUMP_FILE_PATH;
    try {
      await fs.writeFile(
        filePath,
        JSON.stringify(stateManager.getMessages(), null, 2),
      );
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
        stateManager.setMessages([
          stateManager.getMessageAt(0),
          ...loadedMessages.slice(1),
        ]);
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
    stateManager,
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
