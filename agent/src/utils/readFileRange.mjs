import fs from "node:fs/promises";

/**
 * @param {{filePath: string, startLine?: number, endLine?: number}} fileRange
 * @returns {Promise<string | Error>}
 */
export async function readFileRange({ filePath, startLine, endLine }) {
  /** @type {string} */
  let fileContent;
  try {
    fileContent = await fs.readFile(filePath, { encoding: "utf-8" });
  } catch (error) {
    return new Error(
      `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const lines = fileContent.split("\n");

  if (startLine) {
    const start = startLine;
    const end = endLine ? endLine : start;

    if (!(1 <= start && start <= end && end <= lines.length)) {
      return new Error(
        `Invalid line range. File ${filePath} has ${lines.length} lines.`,
      );
    }

    return lines.slice(start - 1, end).join("\n");
  }
  return fileContent;
}
