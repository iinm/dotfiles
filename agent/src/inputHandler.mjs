/**
 * Input Handler Module
 *
 * Manages different types of user input processing.
 *
 * @import { Message, MessageContentText, MessageContentImage, MessageContentToolUse, MessageContentToolResult } from "./model"
 * @import { AgentEventEmitter } from "./agent"
 */

/**
 * @typedef {MessageContentText | MessageContentImage | MessageContentToolResult} MessageContent
 */

/**
 * @typedef {Object} InputHandlerContext
 * @property {{ messages: Message[] }} state
 * @property {import("./toolExecutor.mjs").ToolExecutor} toolExecutor
 * @property {import("./subagentManager.mjs").SubagentManager} subagentManager
 * @property {import("./tool.d.ts").ToolUseApprover} toolUseApprover
 * @property {AgentEventEmitter} agentEventEmitter
 */

/**
 * @typedef {Object} InputHandler
 * @property {(input: MessageContent[]) => Promise<void>} handle
 */

/**
 * Create an input handler.
 *
 * @param {InputHandlerContext} context
 * @returns {InputHandler}
 */
export function createInputHandler(context) {
  const {
    state,
    toolExecutor,
    subagentManager,
    toolUseApprover,
    agentEventEmitter,
  } = context;

  /**
   * Determine input type based on current state and input.
   * @param {MessageContent[]} input
   * @returns {'toolApproval' | 'resume' | 'regular'}
   */
  function determineInputType(input) {
    const lastMessage = state.messages.at(-1);

    // Check if there's a pending tool call
    if (
      lastMessage?.content.some(
        (/** @type {any} */ part) => part.type === "tool_use",
      )
    ) {
      return "toolApproval";
    }

    // Check if input is a resume command
    if (
      input.length === 1 &&
      input[0].type === "text" &&
      input[0].text.toLowerCase() === "/resume"
    ) {
      return "resume";
    }

    return "regular";
  }

  /**
   * Handle tool approval/rejection input.
   * @param {MessageContent[]} input
   */
  async function handleToolApproval(input) {
    const lastMessage = state.messages.at(-1);
    if (!lastMessage) return;

    /** @type {MessageContentToolUse[]} */
    const toolUseParts = /** @type {MessageContentToolUse[]} */ (
      lastMessage.content.filter(
        (/** @type {any} */ part) => part.type === "tool_use",
      )
    );

    // Check if input is an approval
    const isApproval =
      input.length === 1 &&
      input[0].type === "text" &&
      /** @type {MessageContentText} */ (input[0]).text
        .toLocaleLowerCase()
        .match(/^(yes|y|ｙ)$/i);

    if (isApproval) {
      // Check for explicit uppercase approval
      if (
        /** @type {MessageContentText} */ (input[0]).text.match(/^(YES|Y)$/)
      ) {
        // Allow tool use
        for (const toolUse of toolUseParts) {
          toolUseApprover.allowToolUse(toolUse);
        }
      }

      // Execute tools
      /** @type {MessageContentToolResult[]} */
      const toolResults = [];
      for (const toolUse of toolUseParts) {
        toolResults.push(await toolExecutor.execute(toolUse));
      }

      // Process tool results (handles subagent-specific logic)
      const result = subagentManager.processToolResults(
        toolUseParts,
        toolResults,
        state.messages,
      );
      state.messages = result.messages;

      if (result.newMessage) {
        state.messages = [...state.messages, result.newMessage];
      } else {
        state.messages = [
          ...state.messages,
          { role: "user", content: toolResults },
        ];
      }

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

      state.messages = [
        ...state.messages,
        { role: "user", content: toolResults },
        {
          role: "user",
          content: input,
        },
      ];
    }
  }

  /**
   * Handle resume command.
   */
  async function handleResume() {
    // Resume the conversation stopped by rate limit, etc.
    // No state changes needed
  }

  /**
   * Handle regular user message.
   * @param {MessageContent[]} input
   */
  async function handleRegular(input) {
    state.messages = [
      ...state.messages,
      {
        role: "user",
        content: input,
      },
    ];
  }

  return {
    async handle(input) {
      const inputType = determineInputType(input);

      switch (inputType) {
        case "toolApproval":
          await handleToolApproval(input);
          break;
        case "resume":
          await handleResume();
          break;
        case "regular":
          await handleRegular(input);
          break;
      }
    },
  };
}
