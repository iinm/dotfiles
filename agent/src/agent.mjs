/**
 * @import { Agent, AgentConfig, AgentEventEmitter, UserEventEmitter } from "./agent"
 * @import { Message, MessageContentToolResult, MessageContentToolUse, PartialMessageContent } from "./model"
 * @import { Tool, ToolDefinition } from "./tool"
 * @import { DelegateToSubagentInput } from "./tools/delegateToSubagent.mjs";
 * @import { ReportAsSubagentInput } from "./tools/reportAsSubagent.mjs";
 */

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";
import { AGENT_PROJECT_METADATA_DIR, MESSAGES_DUMP_FILE_PATH } from "./env.mjs";
import { delegateToSubagentTool } from "./tools/delegateToSubagent.mjs";
import { reportAsSubagentTool } from "./tools/reportAsSubagent.mjs";
import { resetContextTool } from "./tools/resetContext.mjs";
import { consumeInterruptMessage } from "./utils/consumeInterruptMessage.mjs";
import { noThrow } from "./utils/noThrow.mjs";

/**
 * @param {AgentConfig} config
 * @returns {Agent}
 */
export function createAgent({ callModel, prompt, tools, toolUseApprover }) {
  /** @type {{ messages: Message[], subagents: { name: string, goal: string, delegateResultMessageIndex: number }[] }} */
  const state = {
    messages: [
      {
        role: "system",
        content: [{ type: "text", text: prompt }],
      },
    ],
    subagents: [],
  };

  /** @type {UserEventEmitter} */
  const userEventEmitter = new EventEmitter();
  /** @type {AgentEventEmitter} */
  const agentEventEmitter = new EventEmitter();

  /**
   * Process tool results and update state based on special tools
   * @param {MessageContentToolUse[]} toolUseParts
   * @param {MessageContentToolResult[]} toolResults
   */
  function processToolResults(toolUseParts, toolResults) {
    const resetContextToolUse = toolUseParts.find(
      (toolUse) => toolUse.toolName === resetContextTool.def.name,
    );
    const reportSubagentToolUse = toolUseParts.find(
      (toolUse) => toolUse.toolName === reportAsSubagentTool.def.name,
    );

    if (resetContextToolUse) {
      handleContextReset(toolResults);
    } else if (reportSubagentToolUse) {
      handleSubagentReport(reportSubagentToolUse, toolResults);
    } else {
      state.messages.push({ role: "user", content: toolResults });
    }
  }

  /**
   * Handle context reset by clearing conversation history except system prompt.
   * @param {MessageContentToolResult[]} toolResults
   * @returns {void}
   */
  function handleContextReset(toolResults) {
    // Keep only the system prompt
    state.messages.splice(1, state.messages.length - 1);
    // To avoid "a final `assistant` message must start with a thinking block" error from claude
    // convert tool results to user message
    const memoryContents = toolResults.flatMap(({ content }) => content);
    state.messages.push({
      role: "user",
      content: memoryContents,
    });
  }

  /**
   * Handle the result of a subagent reporting back.
   * On success, truncates conversation history back to the delegation point
   * and converts the report into a standard user message.
   * @param {MessageContentToolUse} reportToolUse
   * @param {MessageContentToolResult[]} toolResults
   */
  function handleSubagentReport(reportToolUse, toolResults) {
    const reportResult = toolResults.find(
      (res) => res.toolUseId === reportToolUse.toolUseId,
    );

    if (reportResult?.isError) {
      state.messages.push({ role: "user", content: toolResults });
      return;
    }

    const currentSubagent = state.subagents.pop();
    if (!currentSubagent) {
      // Fallback if state is out of sync
      state.messages.push({ role: "user", content: toolResults });
      return;
    }

    // Truncate history back to before the delegation point (remove delegate tool_use, tool_result, and subagent history)
    state.messages.splice(
      currentSubagent.delegateResultMessageIndex - 1,
      state.messages.length - (currentSubagent.delegateResultMessageIndex - 1),
    );

    agentEventEmitter.emit(
      "subagentStatus",
      state.subagents.length > 0 ? (state.subagents.at(-1) ?? null) : null,
    );

    // Convert the tool result into a standard user message since the original
    // tool_use was truncated.
    const resultText = reportResult?.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");
    state.messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `The subagent "${currentSubagent.name}" has completed the task.\n\nOriginal goal: ${currentSubagent.goal}\n\nResult:\n${resultText}`,
        },
      ],
    });
  }

  // Inject delegate/report tool implementations that require access to the agent state
  const injectedTools = tools.map((tool) => {
    if (tool.def.name === delegateToSubagentTool.def.name) {
      return {
        ...tool,
        /**
         * @param {DelegateToSubagentInput} input
         */
        impl: async (input) =>
          noThrow(async () => {
            if (state.subagents.length > 0) {
              return new Error(
                "Cannot call delegate_to_subagent while already acting as a subagent.",
              );
            }
            const { name, goal } = input;

            state.subagents.push({
              name,
              goal,
              delegateResultMessageIndex: state.messages.length,
            });

            agentEventEmitter.emit("subagentStatus", { name });

            return [
              `You are now acting as the subagent "${name}".`,
              `Goal: ${goal}`,
              `Memory file path format: ${AGENT_PROJECT_METADATA_DIR}/memory/<session-id>--${name}--<kebab-case-title>.md (Replace <kebab-case-title> to match the parent task)`,
              "",
              `Please complete the task and when finished, call the "report_as_subagent" tool with the memory file path.`,
            ].join("\n");
          }),
      };
    }

    if (tool.def.name === reportAsSubagentTool.def.name) {
      return {
        ...tool,
        /**
         * @param {ReportAsSubagentInput} input
         */
        impl: async (input) =>
          await noThrow(async () => {
            if (state.subagents.length === 0) {
              return new Error(
                "Cannot call report_as_subagent from the main agent.",
              );
            }
            const { memoryPath } = input;

            const workingDir = process.cwd();
            const absolutePath = path.resolve(memoryPath);
            const relativePath = path.relative(workingDir, absolutePath);
            if (
              relativePath.startsWith("..") ||
              path.isAbsolute(relativePath)
            ) {
              return new Error(
                "Access denied: memoryPath must be within the working directory",
              );
            }

            let memoryContent;
            try {
              memoryContent = await fs.readFile(absolutePath, {
                encoding: "utf-8",
              });
            } catch (error) {
              return new Error(
                `Failed to read memory file: ${error instanceof Error ? error.message : String(error)}`,
              );
            }

            return memoryContent;
          }),
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

  userEventEmitter.on("userInput", async (input) => {
    toolUseApprover.resetApprovalCount();

    const lastMessage = state.messages.at(-1);

    if (lastMessage?.content.some((part) => part.type === "tool_use")) {
      /** @type {MessageContentToolUse[]} */
      const toolUseParts = lastMessage.content.filter(
        (part) => part.type === "tool_use",
      );
      // Pending tool call
      if (
        input.length === 1 &&
        input[0].type === "text" &&
        input[0].text.toLocaleLowerCase().match(/^(yes|y|ｙ)$/i)
      ) {
        if (input[0].text.match(/^(YES|Y)$/)) {
          // Allow tool use
          for (const toolUse of toolUseParts) {
            toolUseApprover.allowToolUse(toolUse);
          }
        }

        // Approved
        /** @type {MessageContentToolResult[]} */
        const toolResults = [];
        for (const toolUse of toolUseParts) {
          toolResults.push(await callTool(toolUse, toolByName));
        }

        processToolResults(toolUseParts, toolResults);

        agentEventEmitter.emit(
          "message",
          state.messages[state.messages.length - 1],
        );
      } else {
        // Rejected
        /** @type {MessageContentToolResult[]} */
        const toolResults = toolUseParts.map((toolUse) => ({
          type: "tool_result",
          toolUseId: toolUse.toolUseId,
          toolName: toolUse.toolName,
          content: [{ type: "text", text: "Tool call rejected" }],
          isError: true,
        }));
        state.messages.push({ role: "user", content: toolResults });
        state.messages.push({
          role: "user",
          content: input,
        });
      }
    } else if (
      input.length === 1 &&
      input[0].type === "text" &&
      input[0].text.toLowerCase() === "/resume"
    ) {
      // Resume the conversation stopped by rate limit, etc.
    } else {
      // No pending tool call
      state.messages.push({
        role: "user",
        content: input,
      });
    }

    let thinkingLoops = 0;
    const maxThinkingLoops = 5;

    while (true) {
      const modelOutput = await callModel({
        messages: state.messages,
        tools: toolDefs,
        /**
         * @param {PartialMessageContent} partialContent
         */
        onPartialMessageContent: (partialContent) => {
          agentEventEmitter.emit("partialMessageContent", partialContent);
        },
      });

      if (modelOutput instanceof Error) {
        agentEventEmitter.emit("error", modelOutput);
        break;
      }

      const { message: assistantMessage, providerTokenUsage } = modelOutput;
      state.messages.push(assistantMessage);
      agentEventEmitter.emit("message", assistantMessage);
      agentEventEmitter.emit("providerTokenUsage", providerTokenUsage);

      // Gemini may stop with "thinking" -> continue
      const lastContent = assistantMessage.content.at(-1);
      if (lastContent?.type === "thinking") {
        thinkingLoops += 1;
        if (thinkingLoops > maxThinkingLoops) {
          break;
        }

        state.messages.push({
          role: "user",
          content: [{ type: "text", text: "System: Continue" }],
        });
        console.error(
          styleText(
            "yellow",
            `\nModel is thinking. Sending "System: Continue" (Loop: ${thinkingLoops}/${maxThinkingLoops})`,
          ),
        );
        continue;
      }

      /** @type {MessageContentToolUse[]} */
      const toolUseParts = assistantMessage.content.filter(
        (part) => part.type === "tool_use",
      );

      // No tool use -> turn end
      if (toolUseParts.length === 0) {
        break;
      }

      // Validate tool use
      const unknownToolNames = toolUseParts
        .filter((toolUse) => !toolByName.has(toolUse.toolName))
        .map(({ toolName }) => toolName);
      if (unknownToolNames.length) {
        /** @type {MessageContentToolResult[]} */
        const toolResults = toolUseParts.map((toolUse) => ({
          type: "tool_result",
          toolUseId: toolUse.toolUseId,
          toolName: toolUse.toolName,
          content: [{ type: "text", text: "Tool call rejected" }],
          isError: true,
        }));
        state.messages.push({ role: "user", content: toolResults });
        state.messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: `System: Tool not found ${unknownToolNames.join(", ")}. Available tools: ${[...toolByName.keys()].join(",")}`,
            },
          ],
        });
        console.error(
          styleText(
            "yellow",
            `\nRejected unknown tool use: ${unknownToolNames.join(", ")}`,
          ),
        );
        continue;
      }

      // Validate exclusive tool use (reset_context, delegate_to_subagent, report_as_subagent)
      const exclusiveToolNames = [
        resetContextTool.def.name,
        delegateToSubagentTool.def.name,
        reportAsSubagentTool.def.name,
      ];
      const exclusiveToolUseParts = toolUseParts.filter((toolUse) =>
        exclusiveToolNames.includes(toolUse.toolName),
      );

      let exclusiveToolViolationMessage = null;
      if (exclusiveToolUseParts.length > 1) {
        const toolNames = exclusiveToolUseParts
          .map((t) => t.toolName)
          .join(", ");
        exclusiveToolViolationMessage = `System: ${toolNames} cannot be called together. Only one of these tools can be called at a time.`;
        console.error(
          styleText(
            "yellow",
            `\nRejected multiple exclusive tool use: ${toolNames}`,
          ),
        );
      } else if (
        exclusiveToolUseParts.length === 1 &&
        toolUseParts.length > 1
      ) {
        const exclusiveToolName = exclusiveToolUseParts[0].toolName;
        exclusiveToolViolationMessage = `System: ${exclusiveToolName} cannot be called with other tools. It must be called alone.`;
        console.error(
          styleText(
            "yellow",
            `\nRejected exclusive tool use with other tools: ${exclusiveToolName}`,
          ),
        );
      }

      if (exclusiveToolViolationMessage) {
        /** @type {MessageContentToolResult[]} */
        const toolResults = toolUseParts.map((toolUse) => ({
          type: "tool_result",
          toolUseId: toolUse.toolUseId,
          toolName: toolUse.toolName,
          content: [{ type: "text", text: "Tool call rejected" }],
          isError: true,
        }));
        state.messages.push({ role: "user", content: toolResults });
        state.messages.push({
          role: "user",
          content: [{ type: "text", text: exclusiveToolViolationMessage }],
        });
        continue;
      }

      // Auto approve tool use
      const decisions = toolUseParts.map(toolUseApprover.isAllowedToolUse);

      const hasDeniedToolUse = decisions.some((d) => d.action === "deny");
      if (hasDeniedToolUse) {
        /** @type {MessageContentToolResult[]} */
        const toolResults = toolUseParts.map((toolUse, index) => {
          const decision = decisions[index];
          const rejectionMessage =
            decision.action === "deny"
              ? `Tool call rejected. ${decision.reason || ""}`.trim()
              : "Tool call rejected due to other denied tool calls";

          return {
            type: "tool_result",
            toolUseId: toolUse.toolUseId,
            toolName: toolUse.toolName,
            content: [{ type: "text", text: rejectionMessage }],
            isError: true,
          };
        });
        state.messages.push({ role: "user", content: toolResults });
        agentEventEmitter.emit(
          "message",
          state.messages[state.messages.length - 1],
        );
        continue;
      }

      const isAllToolUseApproved = decisions.every((d) => d.action === "allow");
      if (!isAllToolUseApproved) {
        agentEventEmitter.emit("toolUseRequest");
        break;
      }

      /** @type {MessageContentToolResult[]} */
      const toolResults = [];
      for (const toolUse of toolUseParts) {
        toolResults.push(await callTool(toolUse, toolByName));
      }

      processToolResults(toolUseParts, toolResults);

      agentEventEmitter.emit(
        "message",
        state.messages[state.messages.length - 1],
      );

      const interruptMessage = await consumeInterruptMessage();
      if (interruptMessage) {
        state.messages.push({
          role: "user",
          content: [{ type: "text", text: interruptMessage }],
        });
        agentEventEmitter.emit(
          "message",
          state.messages[state.messages.length - 1],
        );
      }
    }

    agentEventEmitter.emit("turnEnd");
  });

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
