/**
 * @import { MessageContentToolResult, MessageContentToolUse } from "./model"
 * @import { Tool } from "./tool"
 */

/**
 * @typedef {ReturnType<typeof createToolExecutor>} ToolExecutor
 */

/**
 * @typedef {Object} ToolExecutorOptions
 * @property {string[]} [exclusiveToolNames] - Tool names that must be called exclusively
 */

/**
 * Create a tool executor that handles tool validation, execution, and error handling
 * @param {Map<string, Tool>} toolByName - Map of tool names to tool implementations
 * @param {ToolExecutorOptions} [options] - Configuration options
 */
export function createToolExecutor(toolByName, options = {}) {
  const { exclusiveToolNames = [] } = options;

  /**
   * @typedef {ValidationSuccess | ValidationFailure} ValidationResult
   */

  /**
   * @typedef {Object} ValidationSuccess
   * @property {true} isValid
   */

  /**
   * @typedef {Object} ValidationFailure
   * @property {false} isValid
   * @property {string} errorMessage
   * @property {MessageContentToolResult[]} toolResults
   */

  /**
   * Validate all tool uses (tool existence, input validation, exclusive tool check)
   * @param {MessageContentToolUse[]} toolUseParts - Tool uses to validate
   * @returns {ValidationResult}
   */
  function validateBatch(toolUseParts) {
    // Tool existence + Input validation
    /** @type {{index: number, message: string}[]} */
    const errors = [];

    for (let i = 0; i < toolUseParts.length; i++) {
      const toolUse = toolUseParts[i];
      const tool = toolByName.get(toolUse.toolName);
      if (!tool) {
        errors.push({
          index: i,
          message: `Tool not found: ${toolUse.toolName}`,
        });
        continue;
      }

      if (tool.validateInput) {
        const result = tool.validateInput(toolUse.input);
        if (result instanceof Error) {
          errors.push({ index: i, message: result.message });
        }
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errorMessage: errors.map((e) => e.message).join("; "),
        toolResults: toolUseParts.map((toolUse, index) => {
          const error = errors.find((e) => e.index === index);
          return {
            type: "tool_result",
            toolUseId: toolUse.toolUseId,
            toolName: toolUse.toolName,
            content: [
              {
                type: "text",
                text: error
                  ? error.message
                  : "Tool call rejected due to other tool validation error",
              },
            ],
            isError: true,
          };
        }),
      };
    }

    // Exclusive tool validation
    const exclusiveResult = validateExclusiveTools(toolUseParts);
    if (!exclusiveResult.isValid) {
      return {
        isValid: false,
        errorMessage: exclusiveResult.errorMessage,
        toolResults: toolUseParts.map((t) => ({
          type: "tool_result",
          toolUseId: t.toolUseId,
          toolName: t.toolName,
          content: [{ type: "text", text: exclusiveResult.errorMessage }],
          isError: true,
        })),
      };
    }

    return { isValid: true };
  }

  /**
   * @typedef {ExecuteBatchSuccess | ExecuteBatchFailure} ExecuteBatchResult
   */

  /**
   * @typedef {Object} ExecuteBatchSuccess
   * @property {true} success - Execution succeeded
   * @property {MessageContentToolResult[]} results - Tool results on success
   */

  /**
   * @typedef {Object} ExecuteBatchFailure
   * @property {false} success - Execution failed
   * @property {MessageContentToolResult[]} errors - Error tool results on validation failure
   * @property {string} errorMessage - Error message on validation failure
   */

  /**
   * Validate and execute multiple tools
   * @param {MessageContentToolUse[]} toolUseParts
   * @returns {Promise<ExecuteBatchResult>}
   */
  async function executeBatch(toolUseParts) {
    const validation = validateBatch(toolUseParts);

    if (!validation.isValid) {
      return {
        success: false,
        errors: /** @type {MessageContentToolResult[]} */ (
          validation.toolResults
        ),
        errorMessage: /** @type {string} */ (validation.errorMessage),
      };
    }

    const results = [];
    for (const toolUse of toolUseParts) {
      results.push(await execute(toolUse));
    }

    return {
      success: true,
      results,
    };
  }

  /**
   * Validate exclusive tool constraints
   * @param {MessageContentToolUse[]} toolUseParts
   * @returns {{isValid: true} | {isValid: false, errorMessage: string}}
   */
  function validateExclusiveTools(toolUseParts) {
    const exclusiveTools = toolUseParts.filter((t) =>
      exclusiveToolNames.includes(t.toolName),
    );

    if (exclusiveTools.length > 1) {
      const toolNames = exclusiveTools.map((t) => t.toolName).join(", ");
      return {
        isValid: false,
        errorMessage: `System: ${toolNames} cannot be called together. Only one of these tools can be called at a time.`,
      };
    }

    if (exclusiveTools.length === 1 && toolUseParts.length > 1) {
      return {
        isValid: false,
        errorMessage: `System: ${exclusiveTools[0].toolName} cannot be called with other tools. It must be called alone.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Execute a tool use and return the result
   * @param {MessageContentToolUse} toolUse
   * @returns {Promise<MessageContentToolResult>}
   */
  async function execute(toolUse) {
    const tool = toolByName.get(toolUse.toolName);
    if (!tool) {
      return {
        type: "tool_result",
        toolUseId: toolUse.toolUseId,
        toolName: toolUse.toolName,
        content: [
          { type: "text", text: `Tool not found: ${toolUse.toolName}` },
        ],
        isError: true,
      };
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

  return {
    executeBatch,
    validateBatch,
  };
}
