import { strict as assert } from "node:assert";
import fs from "node:fs";
import { afterEach, describe, it } from "node:test";

import { v4 as uuidv4 } from "uuid";

import { patchFile } from "./patchFile";

describe("patchFile", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const cleanup of [...cleanups].reverse()) {
      await cleanup();
    }
    cleanups.length = 0;
  });

  it("patches a file", async () => {
    // given:
    const tmpFilePath = `/tmp/patchFileTest-${uuidv4()}.txt`;
    const initialContent = [
      "Hello World",
      "This is a test file content 1.",
      "This is a test file content 2.",
      "This is a test file content 3.",
    ].join("\n");
    fs.writeFileSync(tmpFilePath, initialContent);
    cleanups.push(async () => fs.unlinkSync(tmpFilePath));

    // when:
    const diff = `
<<<<<<< SEARCH
Hello World
=======
Hello Universe
>>>>>>> REPLACE

<<<<<<< SEARCH
This is a test file content 2.
This is a test file content 3.
=======
This is a test file content updated 2.
This is a test file content updated 3.
>>>>>>> REPLACE
`;
    const result = await patchFile.invoke({ path: tmpFilePath, diff });

    // then:
    assert.equal(result, `Patched file: ${tmpFilePath}`);
    const patchedContent = fs.readFileSync(tmpFilePath, "utf8");
    const expectedContent = [
      "Hello Universe",
      "This is a test file content 1.",
      "This is a test file content updated 2.",
      "This is a test file content updated 3.",
    ].join("\n");
    assert.equal(patchedContent, expectedContent);
  });
});
