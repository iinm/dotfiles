import assert from "node:assert";
import { describe, it } from "node:test";
import { loadUserMessageContext } from "./loadUserMessageContext.mjs";

describe("loadUserMessageContext", () => {
  it("should convert escaped-space image references", async () => {
    const message =
      "@/Users/iinuma/Downloads/スクリーンショット\\ 2025-08-29\\ 11.36.15.png";
    const result = await loadUserMessageContext(message);
    assert.deepStrictEqual(result, [
      {
        text: "image:/Users/iinuma/Downloads/スクリーンショット 2025-08-29 11.36.15.png",
        type: "text",
      },
    ]);
  });

  it("should convert quoted image references", async () => {
    const message =
      "@'/Users/iinuma/Downloads/スクリーンショット 2025-08-29 11.36.15.png'";
    const result = await loadUserMessageContext(message);
    assert.deepStrictEqual(result, [
      {
        text: "image:/Users/iinuma/Downloads/スクリーンショット 2025-08-29 11.36.15.png",
        type: "text",
      },
    ]);
  });

  it("should preserve file contexts alongside image references", async () => {
    const message = [
      "@README.md:1-2",
      "@'/Users/iinuma/Downloads/example image.png'",
    ].join("\n");

    const result = await loadUserMessageContext(message);

    assert.deepStrictEqual(result, [
      {
        text:
          "@README.md:1-2\n" +
          "image:/Users/iinuma/Downloads/example image.png\n" +
          "\n" +
          '<context location="README.md:1-2">\n' +
          "# Agent\n" +
          "\n" +
          "</context>",
        type: "text",
      },
    ]);
  });
});
