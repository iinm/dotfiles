import { execFileSync } from "node:child_process";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";

/**
 * @param {unknown} arg
 * @returns {boolean}
 */
export function isSafeToolArg(arg) {
  if (typeof arg !== "string") {
    return false;
  }

  // Exceptions:
  // Allow access to agent project metadata directory.
  if (
    arg === AGENT_PROJECT_METADATA_DIR ||
    arg.startsWith(`${AGENT_PROJECT_METADATA_DIR}${path.sep}`)
  ) {
    return true;
  }
  // Allow access to Claude code custom commands.
  const claudeCodeCommandsDir = path.join(".claude", "commands");
  if (
    arg === claudeCodeCommandsDir ||
    arg.startsWith(`${claudeCodeCommandsDir}${path.sep}`)
  ) {
    return true;
  }

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
