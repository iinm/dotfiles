import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  AGENT_CACHE_DIR,
  AGENT_PROJECT_METADATA_DIR,
  AGENT_ROOT,
} from "../env.mjs";

/**
 * @typedef {Object} AgentRole
 * @property {string} id
 * @property {string} description
 * @property {string} content
 * @property {string} filePath
 * @property {string} [import]
 */

/**
 * Load all agent roles from the predefined directories.
 * @returns {Promise<Map<string, AgentRole>>}
 */
export async function loadAgentRoles() {
  const agentDirs = [
    path.resolve(AGENT_ROOT, ".config", "agents"),
    path.resolve(AGENT_PROJECT_METADATA_DIR, "agents"),
  ];

  /** @type {Map<string, AgentRole>} */
  const roles = new Map();

  for (const dir of agentDirs) {
    const files = await getMarkdownFiles(dir).catch((err) => {
      if (err.code !== "ENOENT") {
        console.warn(`Failed to list agent roles in ${dir}:`, err);
      }
      return [];
    });

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const content = await fs.readFile(fullPath, "utf-8").catch((err) => {
        console.warn(`Failed to read agent role file ${fullPath}:`, err);
        return null;
      });

      if (content === null) continue;

      let role = parseAgentRole(file, content, fullPath);
      if (role.import) {
        role = await mergeRemoteRole(role, file, fullPath);
      }

      roles.set(role.id, role);
    }
  }

  return roles;
}

/**
 * Merges a remote role into a local role.
 * @param {AgentRole} localRole
 * @param {string} relativePath
 * @param {string} fullPath
 * @returns {Promise<AgentRole>}
 */
async function mergeRemoteRole(localRole, relativePath, fullPath) {
  const importUrl = localRole.import;
  if (!importUrl) {
    return localRole;
  }

  const fetchedContent = await fetchAndCacheRole(importUrl).catch((err) => {
    console.warn(`Failed to fetch agent role from ${importUrl}:`, err);
    return null;
  });

  if (!fetchedContent) {
    return localRole;
  }

  const remoteRole = parseAgentRole(relativePath, fetchedContent, fullPath);

  return {
    ...remoteRole,
    ...localRole, // Local overrides
    content: `${remoteRole.content}\n\n---\n\n${localRole.content}`.trim(),
    description: localRole.description || remoteRole.description || "",
  };
}

/**
 * Fetch an agent role from a URL and cache it.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchAndCacheRole(url) {
  const hash = crypto.createHash("sha256").update(url).digest("hex");
  const cacheDir = path.join(AGENT_CACHE_DIR, "agents");
  const cachePath = path.join(cacheDir, hash);

  const cachedContent = await fs.readFile(cachePath, "utf-8").catch(() => null);
  if (cachedContent !== null) {
    return cachedContent;
  }

  const fetchedContent = await fetchContent(url);

  // Attempt to cache, but don't block or fail on errors
  fs.mkdir(cacheDir, { recursive: true })
    .then(() => fs.writeFile(cachePath, fetchedContent, "utf-8"))
    .catch((err) => {
      console.warn(`Failed to write cache for ${url}:`, err);
    });

  return fetchedContent;
}

/**
 * Fetch content from a URL.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchContent(url) {
  const githubMatch = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/,
  );

  if (githubMatch) {
    const [, owner, repo, ref, path] = githubMatch;
    const apiUrl = `repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
    try {
      const { execFileSync } = await import("node:child_process");
      return execFileSync(
        "gh",
        ["api", "-H", "Accept: application/vnd.github.v3.raw", apiUrl],
        { encoding: "utf-8" },
      );
    } catch (err) {
      throw new Error(`Failed to fetch from GitHub via gh CLI: ${err}`);
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch agent role from ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

/**
 * Recursively get all markdown files in a directory.
 * @param {string} dir
 * @param {string} [baseDir]
 * @returns {Promise<string[]>}
 */
async function getMarkdownFiles(dir, baseDir = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    let isDirectory = entry.isDirectory();
    let isFile = entry.isFile();

    if (entry.isSymbolicLink()) {
      const stat = await fs.stat(fullPath).catch(() => null);
      if (!stat) continue;
      isDirectory = stat.isDirectory();
      isFile = stat.isFile();
    }

    if (isDirectory) {
      files.push(...(await getMarkdownFiles(fullPath, baseDir)));
    } else if (isFile && entry.name.endsWith(".md")) {
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

/**
 * Parse an agent role file content.
 * @param {string} relativePath
 * @param {string} fileContent
 * @param {string} fullPath
 * @returns {AgentRole}
 */
function parseAgentRole(relativePath, fileContent, fullPath) {
  const id = relativePath.replace(/\.md$/, "");

  // Match YAML frontmatter
  const match = fileContent.match(
    /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/,
  );

  if (!match) {
    return {
      id,
      description: "",
      content: fileContent.trim(),
      filePath: fullPath,
    };
  }

  const frontmatter = match[1];
  const content = match[2].trim();

  return {
    id,
    description: parseFrontmatterField(frontmatter, "description") ?? "",
    content,
    filePath: fullPath,
    import: parseFrontmatterField(frontmatter, "import"),
  };
}

/**
 * Parse a field from YAML frontmatter.
 * @param {string} frontmatter
 * @param {string} field
 * @returns {string | undefined}
 */
function parseFrontmatterField(frontmatter, field) {
  const regex = new RegExp(`^${field}:\\s*(.*)$`, "m");
  const match = frontmatter.match(regex);
  return match ? match[1].trim() : undefined;
}
