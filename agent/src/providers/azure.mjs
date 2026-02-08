import { execFile } from "node:child_process";

/**
 * Note:
 * - Use AZURE_CONFIG_DIR to switch accounts.
 *
 * @returns {Promise<string>}
 */
export async function getAzureAccessToken() {
  /** @type {string} */
  const stdout = await new Promise((resolve, reject) => {
    execFile(
      "az",
      [
        "account",
        "get-access-token",
        "--scope",
        "https://ai.azure.com/.default",
      ],
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

  /** @type {{accessToken: string}} */
  const parsed = JSON.parse(stdout);
  return parsed.accessToken;
}
