import fs from "node:fs";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";

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

  const tmpDir = path.join(AGENT_PROJECT_METADATA_DIR, "tmp");
  const fileName = `${timestamp}-${randomSuffix}--${name}.${extension}`;
  const filePath = path.join(tmpDir, fileName);

  // Ensure tmp directory exists
  await fs.promises.mkdir(tmpDir, { recursive: true });
  await fs.promises.writeFile(filePath, content, "utf8");

  return filePath;
}
