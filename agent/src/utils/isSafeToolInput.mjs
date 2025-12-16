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

  // Disallow any input that contains ".." even if it resolves inside the working directory
  // Example:
  // - When write_file is allowed for ^safe-dir/.+
  // - "safe-dir/../unsafe-path" should be disallowed
  if (absPath.startsWith(`${workingDir}${path.sep}`) && arg.includes("..")) {
    return false;
  }

  // Exceptions:
  // Allow access to agent project metadata directory.
  const agentMemoryDir = path.resolve(
    path.join(AGENT_PROJECT_METADATA_DIR, "memory"),
  );
  const agentTempDir = path.resolve(
    path.join(AGENT_PROJECT_METADATA_DIR, "tmp"),
  );
  if (
    [agentMemoryDir, agentTempDir].includes(absPath) ||
    absPath.startsWith(`${agentMemoryDir}${path.sep}`) ||
    absPath.startsWith(`${agentTempDir}${path.sep}`)
  ) {
    return true;
  }

  // Disallow paths outside the working directory
  const realPathResult = noThrowSync(() => fs.realpathSync(absPath));
  const realPath =
    typeof realPathResult === "string"
      ? realPathResult
      : realPathResult instanceof Error &&
          "path" in realPathResult &&
          typeof realPathResult.path === "string"
        ? realPathResult.path
        : realPathResult;

  if (realPath instanceof Error) {
    console.error(`realpath failed for ${arg}: ${realPath}`);
    return false;
  }

  if (
    realPath !== workingDir &&
    !realPath.startsWith(`${workingDir}${path.sep}`)
  ) {
    return false;
  }

  // Deny git ignored files (which may contain sensitive information or should not be accessed)
  try {
    execFileSync("git", ["check-ignore", "--no-index", "-q", absPath], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    // The path is ignored (exit code 0)
    return false;
  } catch (error) {
    if (
      error instanceof Error &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      if (error.status === 1) {
        // Path is not ignored,
        return true;
      }
      // Other git error (e.g., status 128 if not a git repo)
      return false;
    }
    console.error(`Unexpected error checking git ignore for ${arg}:`, error);
    return false;
  }
}
