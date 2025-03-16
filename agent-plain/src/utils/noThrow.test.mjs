import assert from "node:assert";
import test, { describe } from "node:test";
import { noThrow } from "./noThrow.mjs";

describe("noThrow", () => {
  test("should return the result of the function", async () => {
    const result = await noThrow(() => Promise.resolve(42));
    assert.equal(result, 42);
  });

  test("should return an error if the function throws", async () => {
    const error = await noThrow(() => Promise.reject(new Error(":(")));
    assert(error instanceof Error);
    assert.equal(error.message, ":(");
  });
});
