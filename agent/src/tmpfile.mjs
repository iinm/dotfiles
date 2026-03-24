import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_TMP_DIR } from "./env.mjs";

/**
 * Write content to a temporary file and return the file path
 * @param {string} content - Content to write
 * @param {string} name - File name (e.g., "read_web_page")
 * @param {string} extension - File extension (e.g., "md", "txt")
 * @returns {Promise<string>} Path to the created temporary file
 */
export async function writeTmpFile(content, name, extension = "txt") {
  const timestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", "-")
    .replace(/:/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  const fileName = `${timestamp}-${randomSuffix}--${name}.${extension}`;
  const filePath = path.join(AGENT_TMP_DIR, fileName);

  await fs.mkdir(AGENT_TMP_DIR, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");

  return filePath;
}
