import { parseFileRange } from "./parseFileRange.mjs";
import { readFileRange } from "./readFileRange.mjs";

/**
 * @param {string} message
 * @returns {Promise<string | Error>}
 */
export async function loadUserMessageContext(message) {
  const lines = message.split("\n");

  /** @type {string[]} */
  const contexts = [];
  for (const line of lines) {
    for (const segment of line.split(" ")) {
      if (segment.startsWith("@")) {
        const fileRange = parseFileRange(segment.slice(1));
        if (fileRange instanceof Error) {
          return fileRange;
        }

        const fileContent = await readFileRange(fileRange);
        if (fileContent instanceof Error) {
          return fileContent;
        }

        contexts.push(
          `
<context location="${segment.slice(1)}">
${fileContent}
</context>
          `.trim(),
        );
      }
    }
  }

  return [message, ...contexts].join("\n\n");
}
