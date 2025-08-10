import assert from "node:assert";
import fs from "node:fs";
import { afterEach, describe, it } from "node:test";
import { writeFileTool } from "./writeFile.mjs";

describe("writeFileTool", () => {
  /** @type {(() => Promise<void>)[]} */
  const cleanups = [];

  const generateRandomString = () => Math.random().toString(36).substring(2);

  afterEach(async () => {
    for (const cleanup of [...cleanups].reverse()) {
      await cleanup();
    }
    cleanups.length = 0;
  });

  it("writes to a file", async () => {
    // given:
    const tmpFilePath = `/tmp/writeFileTest-${generateRandomString()}.txt`;
    cleanups.push(async () => fs.unlinkSync(tmpFilePath));

    // when:
    const result = await writeFileTool.impl({
      filePath: tmpFilePath,
      content: "Hello World",
    });

    // then:
    assert.equal(result, `Wrote to file: ${tmpFilePath}`);
    const writtenContent = fs.readFileSync(tmpFilePath, "utf8");
    assert.equal(writtenContent, "Hello World");
  });

  it("rejects parent directory traversal in filePath", async () => {
    // when: filePath contains ../
    const result = await writeFileTool.impl({
      filePath: "../etc/passwd",
      content: "dummy",
    });

    // then: should return an Error
    assert.ok(result instanceof Error);
    assert.match(result.message, /must not contain parent directory traversal/);
  });
});
