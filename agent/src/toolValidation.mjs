/**
 * @import { MessageContentToolUse, MessageContentToolResult } from "./model"
 */

/**
 * @typedef {Object} ExclusiveToolValidationConfig
 * @property {string[]} exclusiveToolNames - 排他的に使用するツール名のリスト
 */

/**
 * @typedef {Object} ToolValidationResult
 * @property {boolean} isValid - 検証結果
 * @property {string} [errorMessage] - エラーメッセージ（isValidがfalseの場合）
 * @property {MessageContentToolResult[]} [toolResults] - エラー時のツール結果（isValidがfalseの場合）
 */

/**
 * 未知のツール使用を検出する
 * @param {MessageContentToolUse[]} toolUseParts - ツール使用パーツの配列
 * @param {Map<string, *>} toolByName - ツール名からツールを取得するマップ
 * @returns {string[]} 未知のツール名の配列
 */
export function findUnknownToolNames(toolUseParts, toolByName) {
  return toolUseParts
    .filter((toolUse) => !toolByName.has(toolUse.toolName))
    .map(({ toolName }) => toolName);
}

/**
 * 未知のツール使用に対するツール結果を生成する
 * @param {MessageContentToolUse[]} toolUseParts - ツール使用パーツの配列
 * @param {string[]} _unknownToolNames - 未知のツール名の配列（使用しない）
 * @returns {MessageContentToolResult[]} ツール結果の配列
 */
export function createUnknownToolResults(toolUseParts, _unknownToolNames) {
  return toolUseParts.map((toolUse) => ({
    type: "tool_result",
    toolUseId: toolUse.toolUseId,
    toolName: toolUse.toolName,
    content: [{ type: "text", text: "Tool call rejected" }],
    isError: true,
  }));
}

/**
 * 未知のツール使用エラーメッセージを生成する
 * @param {string[]} unknownToolNames - 未知のツール名の配列
 * @param {Map<string, *>} toolByName - ツール名からツールを取得するマップ
 * @returns {string} エラーメッセージ
 */
export function createUnknownToolErrorMessage(unknownToolNames, toolByName) {
  return `System: Tool not found ${unknownToolNames.join(", ")}. Available tools: ${[...toolByName.keys()].join(",")}`;
}

/**
 * 排他的ツール使用の検証を行う
 * @param {MessageContentToolUse[]} toolUseParts - ツール使用パーツの配列
 * @param {string[]} exclusiveToolNames - 排他的ツール名のリスト
 * @returns {{isValid: boolean, errorMessage?: string, violationType?: 'multiple'|'with-others', violatedTools?: string[]}} 検証結果
 */
export function validateExclusiveToolUse(toolUseParts, exclusiveToolNames) {
  const exclusiveToolUseParts = toolUseParts.filter((toolUse) =>
    exclusiveToolNames.includes(toolUse.toolName),
  );

  // 複数の排他ツールが同時に呼ばれた場合
  if (exclusiveToolUseParts.length > 1) {
    const toolNames = exclusiveToolUseParts.map((t) => t.toolName);
    return {
      isValid: false,
      errorMessage: `System: ${toolNames.join(", ")} cannot be called together. Only one of these tools can be called at a time.`,
      violationType: "multiple",
      violatedTools: toolNames,
    };
  }

  // 排他ツールが他のツールと同時に呼ばれた場合
  if (exclusiveToolUseParts.length === 1 && toolUseParts.length > 1) {
    const exclusiveToolName = exclusiveToolUseParts[0].toolName;
    return {
      isValid: false,
      errorMessage: `System: ${exclusiveToolName} cannot be called with other tools. It must be called alone.`,
      violationType: "with-others",
      violatedTools: [exclusiveToolName],
    };
  }

  return { isValid: true };
}

/**
 * 排他的ツール使用違反に対するツール結果を生成する
 * @param {MessageContentToolUse[]} toolUseParts - ツール使用パーツの配列
 * @returns {MessageContentToolResult[]} ツール結果の配列
 */
export function createExclusiveToolViolationResults(toolUseParts) {
  return toolUseParts.map((toolUse) => ({
    type: "tool_result",
    toolUseId: toolUse.toolUseId,
    toolName: toolUse.toolName,
    content: [{ type: "text", text: "Tool call rejected" }],
    isError: true,
  }));
}

/**
 * 排他的ツール使用違反のログメッセージを生成する
 * @param {string[]} violatedTools - 違反したツール名の配列
 * @param {'multiple'|'with-others'} violationType - 違反タイプ
 * @returns {string} ログメッセージ
 */
export function createExclusiveToolViolationLogMessage(
  violatedTools,
  violationType,
) {
  if (violationType === "multiple") {
    return `\nRejected multiple exclusive tool use: ${violatedTools.join(", ")}`;
  }
  return `\nRejected exclusive tool use with other tools: ${violatedTools[0]}`;
}

/**
 * ツール使用全体の検証を行う（包括的検証）
 * @param {MessageContentToolUse[]} toolUseParts - ツール使用パーツの配列
 * @param {Map<string, *>} toolByName - ツール名からツールを取得するマップ
 * @param {string[]} exclusiveToolNames - 排他的ツール名のリスト
 * @returns {ToolValidationResult} 検証結果
 */
export function validateToolUse(toolUseParts, toolByName, exclusiveToolNames) {
  // 1. 未知のツール検証
  const unknownToolNames = findUnknownToolNames(toolUseParts, toolByName);
  if (unknownToolNames.length > 0) {
    return {
      isValid: false,
      errorMessage: createUnknownToolErrorMessage(unknownToolNames, toolByName),
      toolResults: createUnknownToolResults(toolUseParts, unknownToolNames),
    };
  }

  // 2. 排他ツール検証
  const exclusiveValidation = validateExclusiveToolUse(
    toolUseParts,
    exclusiveToolNames,
  );
  if (!exclusiveValidation.isValid) {
    return {
      isValid: false,
      errorMessage: exclusiveValidation.errorMessage,
      toolResults: createExclusiveToolViolationResults(toolUseParts),
    };
  }

  return { isValid: true };
}
