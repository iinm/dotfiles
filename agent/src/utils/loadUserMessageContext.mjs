/**
 * @import { MessageContentText, MessageContentImage } from "../model";
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";
import { noThrow } from "./noThrow.mjs";
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

/**
 * @param {string} message
 * @returns {Promise<(MessageContentText | MessageContentImage)[]>}
 */
export async function loadUserMessageContext(message) {
  const workingDir = process.cwd();

  /** @type {string[]} */
  const text = [];
  /** @type {string[]} */
  const contexts = [];
  /** @type {MessageContentImage[]} */
  const images = [];

  let cursor = 0;
  for (const match of message.matchAll(
    /(^|\s)@(?:'([^']+)'|((?:\\ |[^\s])+))/g,
  )) {
    if (cursor < match.index) {
      text.push(message.slice(cursor, match.index));
    }
    cursor = match.index + match[0].length;
    const [entireMatch, leading, quoted, escaped] = match;
    const reference = quoted ?? escaped.replace(/\\ /g, " ");

    const ext = path.extname(reference).toLowerCase();
    if (IMAGE_MIME_TYPES.has(ext)) {
      const imageContent = await loadImageContent(reference);
      if (imageContent instanceof Error) {
        warn(`Failed to load image from ${reference}: ${imageContent.message}`);
        text.push(entireMatch);
        continue;
      }
      images.push(imageContent);
      text.push(`${leading}[Image #${images.length}:${reference}]`);
      continue;
    }

    const contextSnippet = await loadContextSnippet(reference, workingDir);
    if (contextSnippet) {
      contexts.push(contextSnippet);
    }
    text.push(entireMatch);
  }

  if (cursor < message.length) {
    text.push(message.slice(cursor));
  }

  return [
    { type: "text", text: [text.join(""), ...contexts].join("\n\n") },
    ...images,
  ];
}

/**
 * @param {string} reference
 * @param {string} workingDir
 * @returns {Promise<string | null>}
 */
async function loadContextSnippet(reference, workingDir) {
  const fileRange = parseFileRange(reference);
  if (fileRange instanceof Error) {
    warn(`Failed to parse context reference ${reference}: ${fileRange}`);
    return null;
  }

  const absolutePath = path.resolve(fileRange.filePath);
  const relativePath = path.relative(workingDir, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    warn(
      `Refusing to load context from outside working directory: ${absolutePath}`,
    );
    return null;
  }

  const fileContent = await readFileRange(fileRange);
  if (fileContent instanceof Error) {
    warn(`Failed to load context from ${reference}: ${fileContent}`);
    return null;
  }

  return [`<context location="${reference}">`, fileContent, "</context>"].join(
    "\n",
  );
}

/**
 * @param {string} imagePath
 * @returns {Promise<MessageContentImage | Error>}
 */
async function loadImageContent(imagePath) {
  const absolutePath = path.resolve(imagePath);

  return await noThrow(async () => {
    const data = await readFile(absolutePath);
    return {
      type: "image",
      data: data.toString("base64"),
      mimeType: inferMimeType(absolutePath),
    };
  });
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function inferMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES.get(extension);
  if (!mimeType) {
    throw new Error(
      `Unsupported image extension: ${extension} (file: ${filePath})`,
    );
  }

  return mimeType;
}

/**
 * @param {string} message
 * @returns {void}
 */
function warn(message) {
  console.warn(styleText("yellow", message));
}
