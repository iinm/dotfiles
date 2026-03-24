import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  AGENT_MEMORY_DIR,
  AGENT_TMP_DIR,
  CLAUDE_CODE_PLUGIN_DIR,
} from "./env.mjs";
import { noThrowSync } from "./utils/noThrow.mjs";

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

  // Allow safe path even if git-ignored.
  if (isSafePath(realPath)) {
    return true;
  }

  // Deny git ignored files (which may contain sensitive information or should not be accessed)
  return !isGitIgnored(realPath);
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
 * @param {string} targetPath
 * @returns {boolean}
 */
function isSafePath(targetPath) {
  const safePaths = [AGENT_MEMORY_DIR, AGENT_TMP_DIR, CLAUDE_CODE_PLUGIN_DIR];

  for (const safePath of safePaths) {
    const safeAbsPath = path.resolve(safePath);
    if (
      targetPath === safeAbsPath ||
      targetPath.startsWith(`${safeAbsPath}${path.sep}`)
    ) {
      return true;
    }
  }

  return false;
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
