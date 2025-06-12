import { execFile } from "node:child_process";
import { AGENT_NOTIFY_CMD } from "../env.mjs";
import { noThrow } from "./noThrow.mjs";

/**
 * @returns {Promise<undefined | Error>}
 */
export async function notify() {
  if (!AGENT_NOTIFY_CMD) {
    return;
  }

  return await noThrow(async () => {
    return new Promise((resolve, reject) => {
      execFile(
        /** @type {string} */ (AGENT_NOTIFY_CMD),
        [],
        {
          shell: false,
          env: {
            PWD: process.env.PWD,
            PATH: process.env.PATH,
            HOME: process.env.HOME,
          },
          timeout: 10 * 1000,
        },
        (err) => {
          if (err) {
            return reject(
              new Error(`Notification command failed: ${err.message}`),
            );
          }

          return resolve(undefined);
        },
      );
    });
  });
}
