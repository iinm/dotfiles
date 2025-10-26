/**
 * @import { MessageContentText, MessageContentImage } from "../model";
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";
import { parseFileRange } from "./parseFileRange.mjs";
import { readFileRange } from "./readFileRange.mjs";

/** @type {readonly string[]} */
const SUPPORTED_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
];

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
    const imagePath = parseImageReference(line);
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
      processedLines.push(`[Image #${imageIndex}]`);
      imageContents.push(imageContent);
      continue;
    }

    processedLines.push(line);

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
function parseImageReference(line) {
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

  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    default:
      return "application/octet-stream";
  }
}
