import { styleText } from "node:util";
import { parseFileRange } from "./parseFileRange.mjs";
import { readFileRange } from "./readFileRange.mjs";
import path from "node:path";

/**
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function loadUserMessageContext(message) {
  const workingDir = process.cwd();
  const lines = message.split("\n");

  /** @type {string[]} */
  const contexts = [];
  for (const line of lines) {
    for (const segment of line.split(" ")) {
      if (segment.startsWith("@")) {
        const fileRange = parseFileRange(segment.slice(1));
        if (fileRange instanceof Error) {
          console.warn(
            styleText(
              "yellow",
              `Failed to parse context reference ${segment}: ${fileRange}`,
            ),
          );
          continue;
        }

        const absPath = path.resolve(fileRange.filePath);
        if (!absPath.startsWith(workingDir)) {
          console.warn(
            styleText(
              "yellow",
              `Refusing to load context from outside working directory: ${absPath}`,
            ),
          );
          continue;
        }

        const fileContent = await readFileRange(fileRange);
        if (fileContent instanceof Error) {
          console.warn(
            styleText(
              "yellow",
              `Failed to load context from ${segment}: ${fileContent}`,
            ),
          );
          continue;
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
