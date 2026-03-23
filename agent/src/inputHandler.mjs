/**
 * @import { Message, MessageContentText, MessageContentToolUse, MessageContentToolResult, UserMessage } from "./model"
 * @import { AgentEventEmitter } from "./agent"
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
 * @typedef {ReturnType<typeof createInputHandler>} InputHandler
 */

/**
 * Create an input handler.
 *
 * @param {InputHandlerContext} context
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
   * @param {UserMessage["content"]} input
   * @returns {'toolApproval' | 'resume' | 'text'}
   */
  function determineInputType(input) {
    const lastMessage = state.messages.at(-1);

    // Check if there's a pending tool call
    if (lastMessage?.content.some((part) => part.type === "tool_use")) {
      return "toolApproval";
    }

    if (
      input.length === 1 &&
      input[0].type === "text" &&
      input[0].text.toLowerCase() === "/resume"
    ) {
      return "resume";
    }

    return "text";
  }

  /**
   * Handle tool approval/rejection input.
   * @param {UserMessage["content"]} input
   */
  async function handleToolApproval(input) {
    const lastMessage = state.messages.at(-1);
    if (!lastMessage) return;

    /** @type {MessageContentToolUse[]} */
    const toolUseParts = lastMessage.content.filter(
      (part) => part.type === "tool_use",
    );

    const isApproval =
      input.length === 1 &&
      input[0].type === "text" &&
      input[0].text.toLocaleLowerCase().match(/^(yes|y|ｙ)$/i);

    if (isApproval) {
      if (
        /** @type {MessageContentText} */ (input[0]).text.match(/^(YES|Y)$/)
      ) {
        for (const toolUse of toolUseParts) {
          toolUseApprover.allowToolUse(toolUse);
        }
      }

      const executionResult = await toolExecutor.executeBatch(toolUseParts);
      if (!executionResult.success) {
        state.messages = [
          ...state.messages,
          { role: "user", content: executionResult.errors },
        ];
        agentEventEmitter.emit(
          "message",
          state.messages[state.messages.length - 1],
        );
        return;
      }

      const toolResults = executionResult.results;
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

  async function handleResume() {
    // Resume the conversation stopped by unexpected error, etc.
    // No state changes needed
  }

  /**
   * @param {UserMessage["content"]} input
   */
  async function handleText(input) {
    state.messages = [
      ...state.messages,
      {
        role: "user",
        content: input,
      },
    ];
  }

  return {
    /**
     * @param {UserMessage["content"]} input
     */
    async handle(input) {
      const inputType = determineInputType(input);

      switch (inputType) {
        case "toolApproval":
          await handleToolApproval(input);
          break;
        case "resume":
          await handleResume();
          break;
        case "text":
          await handleText(input);
          break;
      }
    },
  };
}
