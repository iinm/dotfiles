import assert from "node:assert";
import fs from "node:fs";
import { afterEach, describe, it } from "node:test";
import { patchFileTool } from "./patchFile.mjs";

describe("patchFileTool", () => {
  /** @type {(() => Promise<void>)[]} */
  const cleanups = [];

  const generateRandomString = () => Math.random().toString(36).substring(2);

  afterEach(async () => {
    for (const cleanup of [...cleanups].reverse()) {
      await cleanup();
    }
    cleanups.length = 0;
  });

  it("patches a file", async () => {
    // given:
    const tmpFilePath = `tmp/patchFileTest-${generateRandomString()}.txt`;
    fs.mkdirSync("tmp", { recursive: true });
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
    const result = await patchFileTool.impl({ filePath: tmpFilePath, diff });

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

  it("removes header content", async () => {
    // given:
    const tmpFilePath = `tmp/patchFileTest-${generateRandomString()}.txt`;
    fs.mkdirSync("tmp", { recursive: true });
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
>>>>>>> REPLACE
`.trim();
    const result = await patchFileTool.impl({ filePath: tmpFilePath, diff });

    // then:
    assert.equal(result, `Patched file: ${tmpFilePath}`);
    const patchedContent = fs.readFileSync(tmpFilePath, "utf8");
    const expectedContent = [
      "This is a test file content 1.",
      "This is a test file content 2.",
      "This is a test file content 3.",
    ].join("\n");
    assert.equal(patchedContent, expectedContent);
  });

  it("removes footer content", async () => {
    // given:
    const tmpFilePath = `tmp/patchFileTest-${generateRandomString()}.txt`;
    fs.mkdirSync("tmp", { recursive: true });
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
This is a test file content 3.
=======
>>>>>>> REPLACE
`.trim();
    const result = await patchFileTool.impl({ filePath: tmpFilePath, diff });

    // then:
    assert.equal(result, `Patched file: ${tmpFilePath}`);
    const patchedContent = fs.readFileSync(tmpFilePath, "utf8");
    const expectedContent = [
      "Hello World",
      "This is a test file content 1.",
      "This is a test file content 2.",
    ].join("\n");
    assert.equal(patchedContent, expectedContent);
  });

  it("handles special characters in replacement string", async () => {
    // given:
    const tmpFilePath = `tmp/patchFileTest-${generateRandomString()}.txt`;
    fs.mkdirSync("tmp", { recursive: true });
    const initialContent = "Hello World\nThis is a test.";
    fs.writeFileSync(tmpFilePath, initialContent);
    cleanups.push(async () => fs.unlinkSync(tmpFilePath));

    // when: replacement string contains special characters like $&, $1, $$, %
    const diff = `
<<<<<<< SEARCH
Hello World
=======
Price: $100 & 50% off $& special $1 deal $$
>>>>>>> REPLACE
`;
    const result = await patchFileTool.impl({ filePath: tmpFilePath, diff });

    // then: special characters should be treated literally, not as regex replacement patterns
    assert.equal(result, `Patched file: ${tmpFilePath}`);
    const patchedContent = fs.readFileSync(tmpFilePath, "utf8");
    const expectedContent =
      "Price: $100 & 50% off $& special $1 deal $$\nThis is a test.";
    assert.equal(patchedContent, expectedContent);
  });

  it("handles dollar signs in replacement string", async () => {
    // given:
    const tmpFilePath = `tmp/patchFileTest-${generateRandomString()}.txt`;
    fs.mkdirSync("tmp", { recursive: true });
    const initialContent = "Original text here";
    fs.writeFileSync(tmpFilePath, initialContent);
    cleanups.push(async () => fs.unlinkSync(tmpFilePath));

    // when: replacement string contains various dollar sign patterns
    const diff = `
<<<<<<< SEARCH
Original text here
=======
$& means match, $1 means first group, $$ means literal dollar
>>>>>>> REPLACE
`;
    const result = await patchFileTool.impl({ filePath: tmpFilePath, diff });

    // then: all dollar signs should be treated literally
    assert.equal(result, `Patched file: ${tmpFilePath}`);
    const patchedContent = fs.readFileSync(tmpFilePath, "utf8");
    const expectedContent =
      "$& means match, $1 means first group, $$ means literal dollar";
    assert.equal(patchedContent, expectedContent);
  });

  it("rejects parent directory traversal in filePath", async () => {
    // when: filePath contains ../
    const result = await patchFileTool.impl({
      filePath: "../etc/passwd",
      diff: "",
    });

    // then: should return an Error
    assert.ok(result instanceof Error);
    assert.match(
      result.message,
      /filePath must be within the current working directory/,
    );
  });
});
