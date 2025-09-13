/**
 * @param {string} fileRange
 * @returns {{filePath: string, startLine?: number, endLine?: number} | Error}
 */
export function parseFileRange(fileRange) {
  const match = fileRange.match(/^([^:]+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) {
    return new Error(
      "Invalid format. Use: path/to/file[:line] or path/to/file[:start-end]",
    );
  }
  const [, filePath, startLine, endLine] = match;
  return {
    filePath,
    startLine: startLine ? Number.parseInt(startLine, 10) : undefined,
    endLine: endLine ? Number.parseInt(endLine, 10) : undefined,
  };
}
