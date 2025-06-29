import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";

/**
 * @param {unknown} arg
 */
export function isSafeRelativePath(arg) {
  if (typeof arg !== "string") {
    return false;
  }

  // Exceptions
  if ([".claude/commands"].includes(arg)) {
    return true;
  }

  // Deny absolute paths or parent directory traversal
  if (
    arg.startsWith("/") ||
    arg.startsWith("..") ||
    arg.split("/").includes("..")
  ) {
    return false;
  }

  // Always allow access to agent project metadata directory
  if (
    arg === AGENT_PROJECT_METADATA_DIR ||
    arg.startsWith(`${AGENT_PROJECT_METADATA_DIR}/`)
  ) {
    return true;
  }

  // Deny git ignored files (which may contain sensitive information or should not be accessed)
  if (fs.existsSync(arg)) {
    try {
      execFileSync("git", ["check-ignore", "--no-index", "-q", arg], {
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
        } else {
          // Other git error (e.g., status 128 if not a git repo).
          return false;
        }
      } else {
        console.error(
          `Unexpected error checking git ignore for ${arg}:`,
          error,
        );
        return false;
      }
    }
  }

  return true;
}
