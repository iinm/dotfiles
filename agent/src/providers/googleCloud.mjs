import { execFile } from "node:child_process";

export async function getGoogleCloudAccessToken() {
  /** @type {string} */
  const stdout = await new Promise((resolve, reject) => {
    execFile(
      "gcloud",
      ["auth", "print-access-token"],
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
