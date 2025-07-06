import { execFileSync } from "node:child_process";
import { noThrowSync } from "./noThrow.mjs";

/**
 * @param {string=} notifyCmd
 * @returns {void | Error}
 */
export function notify(notifyCmd) {
  if (!notifyCmd) {
    return;
  }

  return noThrowSync(() => {
    execFileSync(/** @type {string} */ (notifyCmd), [], {
      shell: false,
      stdio: ["ignore", "inherit", "pipe"],
      env: {
        PWD: process.env.PWD,
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        // for Linux
        DISPLAY: process.env.DISPLAY,
        DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
      },
      timeout: 10 * 1000,
    });
  });
}
