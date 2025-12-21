import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { resetContextTool } from "./resetContext.mjs";

describe("resetContextTool", () => {
  /** @type {(() => Promise<void>)[]} */
  const cleanups = [];

  const generateRandomString = () => Math.random().toString(36).substring(2);

  afterEach(async () => {
    for (const cleanup of [...cleanups].reverse()) {
      await cleanup();
    }
    cleanups.length = 0;
  });

  it("reads context from a memory file", async () => {
    // given:
    const tmpDir = `tmp/resetContextTest-${generateRandomString()}`;
    await fs.mkdir(tmpDir, { recursive: true });
    const memoryPath = path.join(tmpDir, "memory.md");
    const content = "# Test Memory\n\nThis is a test.";
    await fs.writeFile(memoryPath, content, "utf-8");

    cleanups.push(
      async () => await fs.rm(tmpDir, { recursive: true, force: true }),
    );

    // when:
    const result = await resetContextTool.impl({
      memoryPath: memoryPath,
      reason: "testing",
    });

    // then:
    assert.strictEqual(result, content);
  });

  it("rejects parent directory traversal in memoryPath", async () => {
    // when: memoryPath contains ../
    const result = await resetContextTool.impl({
      memoryPath: "../outside.md",
      reason: "testing",
    });

    // then: should return an Error
    assert.ok(result instanceof Error);
    assert.match(
      result.message,
      /Access denied: memoryPath must be within the working directory/,
    );
  });

  it("returns an error if the file does not exist", async () => {
    // when: memoryPath points to a non-existent file
    const result = await resetContextTool.impl({
      memoryPath: "non-existent-file.md",
      reason: "testing",
    });

    // then: should return an Error
    assert.ok(result instanceof Error);
    assert.match(result.message, /ENOENT/);
  });
});
