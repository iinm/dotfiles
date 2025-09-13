import fs from "node:fs/promises";

/**
 * @param {string} filePath
 * @param {number=} startLine
 * @param {number=} endLine
 * @returns {Promise<string | Error>}
 */
export async function readFileRange(filePath, startLine, endLine) {
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
      return new Error(`Invalid line range. File has ${lines.length} lines.`);
    }

    return lines.slice(start - 1, end).join("\n");
  }
  return fileContent;
}
