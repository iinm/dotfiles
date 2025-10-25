import assert from "node:assert";
import { describe, it } from "node:test";
import { loadUserMessageContext } from "./loadUserMessageContext.mjs";

describe("loadUserMessageContext", () => {
  it("should convert escaped-space image references", async () => {
    const message =
      "@/Users/iinuma/Downloads/スクリーンショット\\ 2025-08-29\\ 11.36.15.png";
    const result = await loadUserMessageContext(message);
    assert.strictEqual(
      result,
      "image:/Users/iinuma/Downloads/スクリーンショット 2025-08-29 11.36.15.png",
    );
  });

  it("should convert quoted image references", async () => {
    const message =
      "@'/Users/iinuma/Downloads/スクリーンショット 2025-08-29 11.36.15.png'";
    const result = await loadUserMessageContext(message);
    assert.strictEqual(
      result,
      "image:/Users/iinuma/Downloads/スクリーンショット 2025-08-29 11.36.15.png",
    );
  });

  it("should preserve file contexts alongside image references", async () => {
    const message = [
      "@src/utils/tmpfile.mjs:1-2",
      "@'/Users/iinuma/Downloads/example image.png'",
    ].join("\n");

    const result = await loadUserMessageContext(message);
    const [messagePart, ...contextParts] = result.split("\n\n");

    assert.strictEqual(
      messagePart,
      [
        "@src/utils/tmpfile.mjs:1-2",
        "image:/Users/iinuma/Downloads/example image.png",
      ].join("\n"),
    );

    assert.strictEqual(contextParts.length, 1);
    const [contextPart] = contextParts;
    assert.ok(
      contextPart.startsWith('<context location="src/utils/tmpfile.mjs:1-2">'),
    );
    assert.ok(contextPart.includes('import fs from "node:fs/promises"'));
    assert.ok(contextPart.endsWith("</context>"));
  });
});
