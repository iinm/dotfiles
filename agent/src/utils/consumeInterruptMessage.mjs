import fs from "node:fs";
import { AGENT_INTERRUPT_MESSAGE_FILE_PATH } from "../env.mjs";

/**
 * @returns {Promise<string | undefined>}
 */
export async function consumeInterruptMessage() {
  try {
    const content = await fs.promises.readFile(
      AGENT_INTERRUPT_MESSAGE_FILE_PATH,
      "utf8",
    );
    await fs.promises.unlink(AGENT_INTERRUPT_MESSAGE_FILE_PATH);

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
