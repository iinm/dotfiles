import assert from "node:assert";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { loadUserMessageContext } from "./loadUserMessageContext.mjs";

describe("loadUserMessageContext", () => {
  it("should convert escaped-space image references", async () => {
    // given:
    const sourceImagePath = path.resolve("src/utils/test/iinm.png");
    const tempDir = path.resolve("tmp/load-user-message-context");
    await mkdir(tempDir, { recursive: true });
    const spacedImagePath = path.join(tempDir, "sample image.png");
    await copyFile(sourceImagePath, spacedImagePath);
    const message = `@${spacedImagePath.replace(/ /gu, "\\ ")}`;
    const expectedImageData = await readFile(spacedImagePath, {
      encoding: "base64",
    });

    // when:
    const result = await loadUserMessageContext(message);

    // then:
    assert.deepStrictEqual(result, [
      {
        text: `[Image #1:${spacedImagePath}]`,
        type: "text",
      },
      {
        data: expectedImageData,
        mimeType: "image/png",
        type: "image",
      },
    ]);
  });

  it("should convert quoted image references", async () => {
    // given:
    const sourceImagePath = path.resolve("src/utils/test/iinm.png");
    const tempDir = path.resolve("tmp/load-user-message-context");
    await mkdir(tempDir, { recursive: true });
    const quotedImagePath = path.join(tempDir, "quoted image.png");
    await copyFile(sourceImagePath, quotedImagePath);
    const message = `@'${quotedImagePath}'`;
    const expectedImageData = await readFile(quotedImagePath, {
      encoding: "base64",
    });

    // when:
    const result = await loadUserMessageContext(message);

    // then:
    assert.deepStrictEqual(result, [
      {
        text: `[Image #1:${quotedImagePath}]`,
        type: "text",
      },
      {
        data: expectedImageData,
        mimeType: "image/png",
        type: "image",
      },
    ]);
  });

  it("should support multiple image extensions", async () => {
    // given:
    const sourceImagePath = path.resolve("src/utils/test/iinm.png");
    const tempDir = path.resolve("tmp/load-user-message-context");
    await mkdir(tempDir, { recursive: true });
    const jpegImagePath = path.join(tempDir, "sample photo.jpg");
    await copyFile(sourceImagePath, jpegImagePath);
    const message = `@'${jpegImagePath}'`;
    const expectedImageData = await readFile(jpegImagePath, {
      encoding: "base64",
    });

    // when:
    const result = await loadUserMessageContext(message);

    // then:
    assert.deepStrictEqual(result, [
      {
        text: `[Image #1:${jpegImagePath}]`,
        type: "text",
      },
      {
        data: expectedImageData,
        mimeType: "image/jpeg",
        type: "image",
      },
    ]);
  });

  it("should preserve file contexts alongside image references", async () => {
    // given:
    const sourceImagePath = path.resolve("src/utils/test/iinm.png");
    const tempDir = path.resolve("tmp/load-user-message-context");
    await mkdir(tempDir, { recursive: true });
    const imagePath = path.join(tempDir, "context image.png");
    await copyFile(sourceImagePath, imagePath);
    const message = [
      "@README.md:1-2",
      `@${imagePath.replace(/ /gu, "\\ ")}`,
    ].join("\n");
    const expectedImageData = await readFile(imagePath, {
      encoding: "base64",
    });

    // when:
    const result = await loadUserMessageContext(message);

    // then:
    assert.deepStrictEqual(result, [
      {
        text: [
          "@README.md:1-2",
          `[Image #1:${imagePath}]`,
          "",
          '<context location="README.md:1-2">',
          "# Agent",
          "",
          "</context>",
        ].join("\n"),
        type: "text",
      },
      {
        data: expectedImageData,
        mimeType: "image/png",
        type: "image",
      },
    ]);
  });
});
