import { execFileSync } from "node:child_process";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";

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
  // Note: An argument can be a command option (e.g., '-l').
  // It will then create an absolute path like `/path/to/project/-l`.
  const absPath = path.resolve(arg);

  // Disallow paths outside the project directory.
  const workingDir = process.cwd();
  if (
    absPath !== workingDir &&
    !absPath.startsWith(`${workingDir}${path.sep}`)
  ) {
    return false;
  }

  // Disallow unneeded parent directory reference
  // Example:
  // - When write_file to ^safe-dir/.+ is allowed
  // - Access to safe-dir/../unsafe-path should be disallowed
  if (arg.includes("..")) {
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
