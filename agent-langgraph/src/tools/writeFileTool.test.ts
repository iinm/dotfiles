import assert from "node:assert";
import fs from "node:fs";
import { afterEach, describe, it } from "node:test";

import { writeFileTool } from "./writeFileTool";

describe("writeFileTool", () => {
  const cleanups: (() => Promise<void>)[] = [];

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
    const result = await writeFileTool.invoke({
      path: tmpFilePath,
      content: "Hello World",
    });

    // then:
    assert.equal(result, `Wrote to file: ${tmpFilePath}`);
    const writtenContent = fs.readFileSync(tmpFilePath, "utf8");
    assert.equal(writtenContent, "Hello World");
  });
});
