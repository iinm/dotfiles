/**
 * @import { MessageContentToolResult, MessageContentToolUse } from "./model"
 * @import { Tool } from "./tool"
 */

import { validateToolUse } from "./toolValidation.mjs";

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string} [errorMessage] - Error message if validation failed
 * @property {MessageContentToolResult[]} [toolResults] - Tool results for errors
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
 * @typedef {ExecuteBatchSuccess | ExecuteBatchFailure} ExecuteBatchResult
 */

/**
 * @typedef {Object} ToolExecutor
 * @property {(toolUse: MessageContentToolUse) => Promise<MessageContentToolResult>} execute - Execute a tool and return its result
 * @property {(toolUseParts: MessageContentToolUse[]) => ValidationResult} validateBatch - Validate multiple tool uses before execution
 * @property {(toolUseParts: MessageContentToolUse[]) => Promise<ExecuteBatchResult>} executeBatch - Validate and execute multiple tools
 */

/**
 * @typedef {Object} ToolExecutorOptions
 * @property {string[]} [exclusiveToolNames] - Tool names that must be called exclusively
 */

/**
 * Create a tool executor that handles tool validation, execution, and error handling
 * @param {Map<string, Tool>} toolByName - Map of tool names to tool implementations
 * @param {ToolExecutorOptions} [options] - Configuration options
 * @returns {ToolExecutor}
 */
export function createToolExecutor(toolByName, options = {}) {
  const { exclusiveToolNames = [] } = options;
  /**
   * Execute a tool use and return the result
   * @param {MessageContentToolUse} toolUse - The tool use to execute
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

  /**
   * Validate multiple tool uses before execution
   * @param {MessageContentToolUse[]} toolUseParts - Tool uses to validate
   * @returns {ValidationResult}
   */
  function validateBatch(toolUseParts) {
    return validateToolUse(toolUseParts, toolByName, exclusiveToolNames);
  }

  /**
   * Validate and execute multiple tools
   * @param {MessageContentToolUse[]} toolUseParts - Tool uses to validate and execute
   * @returns {Promise<ExecuteBatchResult>}
   */
  async function executeBatch(toolUseParts) {
    // Phase 1: Batch validation (unknown tools, exclusive tool violations)
    const validation = validateBatch(toolUseParts);

    if (!validation.isValid) {
      // TypeScript: validation.isValid === false guarantees these properties exist
      return {
        success: false,
        errors: /** @type {MessageContentToolResult[]} */ (
          validation.toolResults
        ),
        errorMessage: /** @type {string} */ (validation.errorMessage),
      };
    }

    // Phase 2: Execute each tool (includes individual validation)
    const results = [];
    for (const toolUse of toolUseParts) {
      results.push(await execute(toolUse));
    }

    return {
      success: true,
      results,
    };
  }

  return {
    execute,
    validateBatch,
    executeBatch,
  };
}
