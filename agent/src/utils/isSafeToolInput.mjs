import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";
import { noThrowSync } from "./noThrow.mjs";

/**
 * @param {unknown} input
 * @returns {boolean}
 */
export function isSafeToolInput(input) {
  if (["number", "boolean", "undefined"].includes(typeof input)) {
    return true;
  }

  if (typeof input === "string") {
    return isSafeToolInputItem(input);
  }

  if (Array.isArray(input)) {
    return input.every((item) => isSafeToolInput(item));
  }

  if (typeof input === "object") {
    if (input === null) {
      return true;
    }
    return Object.values(input).every((value) => isSafeToolInput(value));
  }

  return false;
}

/**
 * @param {string} arg
 * @returns {boolean}
 */
export function isSafeToolInputItem(arg) {
  const workingDir = process.cwd();

  // Note: An argument can be a command option (e.g., '-l').
  // It will then create an absolute path like `/path/to/project/-l`.
  const absPath = path.resolve(arg);

  const realPath = resolveRealPath(absPath, workingDir);
  if (!realPath) {
    return false;
  }

  // Disallow paths outside the working directory (WITHOUT EXCEPTION)
  if (!isInsideWorkingDirectory(realPath, workingDir)) {
    return false;
  }

  // Disallow any input that contains ".." as a path segment (directory traversal)
  // Example:
  // - When write_file is allowed for ^safe-dir/.+
  // - "safe-dir/../unsafe-path" should be disallowed
  if (arg.split(path.sep).includes("..")) {
    return false;
  }

  // Allow agent metadata even if git-ignored.
  if (isAgentMetadataPath(absPath)) {
    return true;
  }

  // Deny git ignored files (which may contain sensitive information or should not be accessed)
  return !isGitIgnored(absPath);
}

/**
 * @param {string} absPath
 * @param {string} workingDir
 * @returns {string | null}
 */
function resolveRealPath(absPath, workingDir) {
  const realPathResult = noThrowSync(() => fs.realpathSync(absPath));
  if (!(realPathResult instanceof Error)) {
    return realPathResult;
  }

  // realpathSync can fail if the path (or its target) doesn't exist.
  // Manually follow symlink chain for broken links to ensure they don't point outside.
  let currentPath = absPath;
  const seen = new Set();
  const MAX_SYMLINK_DEPTH = 10;

  for (let depth = 0; depth < MAX_SYMLINK_DEPTH; depth++) {
    if (seen.has(currentPath)) {
      return null; // Circular link
    }
    seen.add(currentPath);

    // Check if the current path is a symbolic link.
    const lstats = noThrowSync(() => fs.lstatSync(currentPath));
    if (lstats instanceof Error || !lstats.isSymbolicLink()) {
      break; // Not a symlink or doesn't exist; stop traversal.
    }

    // Read the target path the symlink points to.
    const target = noThrowSync(() => fs.readlinkSync(currentPath));
    if (typeof target !== "string") {
      break; // Failed to read the link; stop traversal.
    }

    currentPath = path.resolve(path.dirname(currentPath), target);

    // If at any point it goes outside, we stop and use this path for the check.
    if (!isInsideWorkingDirectory(currentPath, workingDir)) {
      return currentPath;
    }
  }

  if (seen.size >= MAX_SYMLINK_DEPTH) {
    return null; // Too deep
  }

  return currentPath;
}

/**
 * @param {string} targetPath
 * @param {string} workingDir
 * @returns {boolean}
 */
function isInsideWorkingDirectory(targetPath, workingDir) {
  return (
    targetPath === workingDir ||
    targetPath.startsWith(`${workingDir}${path.sep}`)
  );
}

/**
 * @param {string} absPath
 * @returns {boolean}
 */
function isAgentMetadataPath(absPath) {
  const agentMemoryDir = path.resolve(
    path.join(AGENT_PROJECT_METADATA_DIR, "memory"),
  );
  const agentTempDir = path.resolve(
    path.join(AGENT_PROJECT_METADATA_DIR, "tmp"),
  );

  return (
    [agentMemoryDir, agentTempDir].includes(absPath) ||
    absPath.startsWith(`${agentMemoryDir}${path.sep}`) ||
    absPath.startsWith(`${agentTempDir}${path.sep}`)
  );
}

/**
 * @param {string} absPath
 * @returns {boolean}
 */
function isGitIgnored(absPath) {
  try {
    execFileSync("git", ["check-ignore", "--no-index", "-q", absPath], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    // The path is ignored (exit code 0)
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "status" in error &&
      typeof error.status === "number" &&
      error.status === 1
    ) {
      // Path is not ignored
      return false;
    }
    // Other errors (e.g., status 128 if not a git repo or other git error)
    // We treat this as "effectively ignored" to be safe.
    return true;
  }
}
