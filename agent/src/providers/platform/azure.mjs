import { execFile } from "node:child_process";

/**
 * @param {{azureConfigDir: string}=} config
 * @returns {Promise<string>}
 */
export async function getAzureAccessToken(config) {
  /** @type {string} */
  const stdout = await new Promise((resolve, reject) => {
    execFile(
      "az",
      [
        "account",
        "get-access-token",
        "--resource",
        "https://cognitiveservices.azure.com",
        "--query",
        "accessToken",
        "--output",
        "tsv",
      ],
      {
        shell: false,
        timeout: 10 * 1000,
        env: config
          ? {
              AZURE_CONFIG_DIR: config.azureConfigDir,
            }
          : undefined,
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
