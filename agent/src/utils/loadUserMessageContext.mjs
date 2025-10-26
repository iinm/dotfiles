/**
 * @import { MessageContentText, MessageContentImage } from "../model";
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";
import { parseFileRange } from "./parseFileRange.mjs";
import { readFileRange } from "./readFileRange.mjs";

/** @type {ReadonlyMap<string, string>} */
const IMAGE_MIME_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
]);

/** @type {readonly string[]} */
const SUPPORTED_IMAGE_EXTENSIONS = Object.freeze(
  Array.from(IMAGE_MIME_TYPES.keys()),
);

/**
 * @param {string} message
 * @returns {Promise<(MessageContentText | MessageContentImage)[]>}
 */
export async function loadUserMessageContext(message) {
  const workingDir = process.cwd();
  const lines = message.split("\n");

  /** @type {string[]} */
  const contexts = [];
  /** @type {string[]} */
  const processedLines = [];
  /** @type {MessageContentImage[]} */
  const imageContents = [];
  let imageIndex = 0;
  for (const line of lines) {
    const imagePath = detectImageReference(line);
    if (imagePath) {
      const imageContent = await loadImageContent(imagePath);
      if (imageContent instanceof Error) {
        console.warn(
          styleText(
            "yellow",
            `Failed to load image from ${imagePath}: ${imageContent.message}`,
          ),
        );
        processedLines.push(line);
        continue;
      }

      imageIndex += 1;
      processedLines.push(`[Image #${imageIndex}:${imagePath}]`);
      imageContents.push(imageContent);
      continue;
    }

    processedLines.push(line);

    const contextReference = detectContextReference(line);
    if (!contextReference) {
      continue;
    }

    const fileRange = parseFileRange(contextReference);
    if (fileRange instanceof Error) {
      console.warn(
        styleText(
          "yellow",
          `Failed to parse context reference ${contextReference}: ${fileRange}`,
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
          `Failed to load context from ${contextReference}: ${fileContent}`,
        ),
      );
      continue;
    }

    contexts.push(
      `
<context location="${contextReference}">
${fileContent}
</context>
      `.trim(),
    );
  }

  const processedMessage = processedLines.join("\n");
  /** @type {MessageContentText} */
  const textContent = {
    type: "text",
    text: [processedMessage, ...contexts].join("\n\n"),
  };

  return [textContent, ...imageContents];
}

/**
 * @param {string} line
 * @returns {string | null}
 */
function detectImageReference(line) {
  const quotedMatch = line.match(/^\s*@'(.+)'\s*$/u);
  if (quotedMatch) {
    const candidatePath = quotedMatch[1];
    return isSupportedImagePath(candidatePath) ? candidatePath : null;
  }

  const escapedMatch = line.match(/^\s*@((?:\\ |[^ ])+)\s*$/u);
  if (escapedMatch) {
    const candidatePath = escapedMatch[1].replace(/\\ /g, " ");
    return isSupportedImagePath(candidatePath) ? candidatePath : null;
  }

  return null;
}

/**
 * @param {string} line
 * @returns {string | null}
 */
function detectContextReference(line) {
  const match = line.match(/(^|\s)@(\S+)/u);
  return match ? match[2] : null;
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isSupportedImagePath(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.includes(extension);
}

/**
 * @param {string} imagePath
 * @returns {Promise<MessageContentImage | Error>}
 */
async function loadImageContent(imagePath) {
  const absolutePath = path.resolve(imagePath);

  try {
    const data = await readFile(absolutePath);
    const mimeType = inferMimeType(absolutePath);
    return {
      type: "image",
      data: data.toString("base64"),
      mimeType,
    };
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function inferMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES.get(extension);

  return mimeType ?? "application/octet-stream";
}
