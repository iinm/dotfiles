import { execFileSync } from "node:child_process";
import { AGENT_NOTIFY_CMD } from "../env.mjs";
import { noThrowSync } from "./noThrow.mjs";

/**
 * @returns {void | Error}
 */
export function notify() {
  if (!AGENT_NOTIFY_CMD) {
    return;
  }

  return noThrowSync(() => {
    execFileSync(/** @type {string} */ (AGENT_NOTIFY_CMD), [], {
      shell: false,
      stdio: ["ignore", "inherit", "pipe"],
      env: {
        PWD: process.env.PWD,
        PATH: process.env.PATH,
        HOME: process.env.HOME,
      },
      timeout: 10 * 1000,
    });
  });
}
