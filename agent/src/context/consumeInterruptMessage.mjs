import fs from "node:fs/promises";
import { AGENT_INTERRUPT_MESSAGE_FILE_PATH } from "../env.mjs";

/**
 * @returns {Promise<string | undefined>}
 */
export async function consumeInterruptMessage() {
  try {
    const content = await fs.readFile(
      AGENT_INTERRUPT_MESSAGE_FILE_PATH,
      "utf8",
    );
    await fs.truncate(AGENT_INTERRUPT_MESSAGE_FILE_PATH, 0);

    if (content.trim() === "") {
      return undefined;
    }
    return content;
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      typeof err.code === "string" &&
      err.code === "ENOENT"
    ) {
      return undefined;
    }
    throw err;
  }
}
