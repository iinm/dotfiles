import { execFile } from "node:child_process";

/**
 * @param {string=} account
 * @returns {Promise<string>}
 */
export async function getGoogleCloudAccessToken(account) {
  /** @type {string} */
  const stdout = await new Promise((resolve, reject) => {
    execFile(
      "gcloud",
      ["auth", "print-access-token", ...(account ? [account] : [])],
      {
        shell: false,
        timeout: 10 * 1000,
      },
      (error, stdout, _stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      },
    );
  });

  return stdout;
}
