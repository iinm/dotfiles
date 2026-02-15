import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR, AGENT_ROOT } from "../env.mjs";

/**
 * @typedef {Object} Prompt
 * @property {string} id
 * @property {string} description
 * @property {string} content
 * @property {string} filePath
 */

/**
 * Load all prompts from the predefined directories.
 * @returns {Promise<Map<string, Prompt>>}
 */
export async function loadPrompts() {
  const promptDirs = [
    path.resolve(AGENT_ROOT, ".config", "prompts.predefined"),
    path.resolve(AGENT_ROOT, ".config", "prompts"),
    path.resolve(AGENT_PROJECT_METADATA_DIR, "prompts"),
  ];

  /** @type {Map<string, Prompt>} */
  const prompts = new Map();

  for (const dir of promptDirs) {
    try {
      const files = await getMarkdownFiles(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const content = await fs.readFile(fullPath, "utf-8");
        const prompt = parsePrompt(file, content, fullPath);
        prompts.set(prompt.id, prompt);
      }
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code !== "ENOENT") {
        console.error(`Error loading prompts from ${dir}:`, err);
      }
    }
  }

  return prompts;
}

/**
 * Recursively get all markdown files in a directory.
 * @param {string} dir
 * @param {string} [baseDir]
 * @returns {Promise<string[]>}
 */
async function getMarkdownFiles(dir, baseDir = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  /** @type {string[]} */
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  return files;
}

/**
 * Parse a prompt file content.
 * @param {string} relativePath
 * @param {string} fileContent
 * @param {string} fullPath
 * @returns {Prompt}
 */
function parsePrompt(relativePath, fileContent, fullPath) {
  const id = relativePath.replace(/\.md$/, "");
  // Match YAML frontmatter
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    return {
      id,
      description: "(No description)",
      content: fileContent.trim(),
      filePath: fullPath,
    };
  }

  const frontmatter = match[1];
  const content = match[2].trim();

  const descriptionMatch = frontmatter.match(/^description:\s*(.*)$/m);
  const description = descriptionMatch ? descriptionMatch[1].trim() : "";

  return { id, description, content, filePath: fullPath };
}
