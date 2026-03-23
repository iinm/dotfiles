import assert from "node:assert";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { after, describe, it } from "node:test";
import { loadUserMessageContext } from "./loadUserMessageContext.mjs";

const SOURCE_IMAGE_PATH = path.resolve("src/utils/test/iinm.png");
const TEMP_DIR = path.resolve("tmp/load-user-message-context");

describe("loadUserMessageContext", () => {
  after(async () => {
    await rm(TEMP_DIR, { recursive: true });
  });

  it("should convert escaped-space image references", async () => {
    // given:
    const { imagePath, imageData } = await prepareImage("sample image.png");
    const message = `@${imagePath.replace(" ", "\\ ")}`;

    // when:
    const result = await loadUserMessageContext(message);

    // then:
    assert.deepStrictEqual(result, [
      {
        text: `[Image #1:${imagePath}]`,
        type: "text",
      },
      {
        data: imageData,
        mimeType: "image/png",
        type: "image",
      },
    ]);
  });

  it("should convert quoted image references", async () => {
    // given:
    const { imagePath, imageData } = await prepareImage("quoted image.png");
    const message = `@'${imagePath}'`;

    // when:
    const result = await loadUserMessageContext(message);

    // then:
    assert.deepStrictEqual(result, [
      {
        text: `[Image #1:${imagePath}]`,
        type: "text",
      },
      {
        data: imageData,
        mimeType: "image/png",
        type: "image",
      },
    ]);
  });

  it("should convert inline image references", async () => {
    // given:
    const { imagePath, imageData } = await prepareImage("inline image.png");
    const message = `before @'${imagePath}' after`;

    // when:
    const result = await loadUserMessageContext(message);

    // then:
    assert.deepStrictEqual(result, [
      {
        text: `before [Image #1:${imagePath}] after`,
        type: "text",
      },
      {
        data: imageData,
        mimeType: "image/png",
        type: "image",
      },
    ]);
  });

  it("should preserve file contexts alongside image references", async () => {
    // given:
    const { imagePath, imageData } = await prepareImage("context image.png");
    const message = [
      "first line",
      "before-README @README.md:1 after-README",
      "middle of text and image",
      `before-image @${imagePath.replace(" ", "\\ ")} after-image`,
      "last line",
    ].join("\n");

    // when:
    const result = await loadUserMessageContext(message);

    // then:
    assert.deepStrictEqual(result, [
      {
        text: [
          "first line",
          "before-README @README.md:1 after-README",
          "middle of text and image",
          `before-image [Image #1:${imagePath}] after-image`,
          "last line",
          "",
          '<context location="README.md:1">',
          "# Agent",
          "</context>",
        ].join("\n"),
        type: "text",
      },
      {
        data: imageData,
        mimeType: "image/png",
        type: "image",
      },
    ]);
  });
});

/**
 * @param {string} fileName
 * @returns {Promise<{imagePath: string, imageData: string}>}
 */
async function prepareImage(fileName) {
  await mkdir(TEMP_DIR, { recursive: true });
  const imagePath = path.join(TEMP_DIR, fileName);
  await copyFile(SOURCE_IMAGE_PATH, imagePath);
  const imageData = await readFile(imagePath, { encoding: "base64" });

  return { imagePath, imageData };
}
