import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
export const AGENT_ROOT = path.dirname(path.dirname(filename));

// Agent
export const AGENT_PROJECT_METADATA_DIR =
  process.env.AGENT_PROJECT_METADATA_DIR || ".agent";
export const AGENT_MODEL = process.env.AGENT_MODEL || "gemini-pro-thinking-8k";
export const AGENT_NOTIFY_CMD =
  process.env.AGENT_NOTIFY_CMD ?? path.join(AGENT_ROOT, "bin", "agent-notify");

// Gemini
export const GEMINI_API_KEY = loadSecret("gemini-api-key.txt");
export const GEMINI_API_BASE_URL =
  process.env.GEMINI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com";

// Anthropic
export const ANTHROPIC_API_KEY = loadSecret("anthropic-api-key.txt");
export const ANTHROPIC_API_BASE_URL =
  process.env.ANTHROPIC_API_BASE_URL || "https://api.anthropic.com";

// OpenAI
export const OPENAI_API_KEY = loadSecret("openai-api-key.txt");
export const OPENAI_API_BASE_URL =
  process.env.OPENAI_API_BASE_URL || "https://api.openai.com";

// Tools
export const TAVILY_API_KEY = loadSecret("tavily-api-key.txt");
export const READ_WEB_PAGE_WITH_BROWSER_TOOL_USER_DATA_DIR = path.join(
  AGENT_ROOT,
  ".cache",
  "chromium-profile",
);

/**
 * @param {string} filename
 * @returns {string=}
 */
function loadSecret(filename) {
  const filePath = path.join(AGENT_ROOT, ".secrets", filename);
  if (!fs.existsSync(filePath)) {
    return;
  }

  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new Error(
      `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return fileContent.trim();
}
