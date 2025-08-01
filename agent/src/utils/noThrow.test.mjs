import assert from "node:assert";
import test, { describe } from "node:test";
import { noThrow, noThrowSync } from "./noThrow.mjs";

describe("noThrow", () => {
  test("returns the result of the function", async () => {
    const result = await noThrow(() => Promise.resolve(42));
    assert.equal(result, 42);
  });

  test("returns an error if the function throws", async () => {
    const error = await noThrow(() => Promise.reject(new Error(":(")));
    assert(error instanceof Error);
    assert.equal(error.message, ":(");
  });
});

describe("noThrowSync", () => {
  test("returns the result of the function", () => {
    const result = noThrowSync(() => 42);
    assert.equal(result, 42);
  });

  test("returns an error if the function throws", () => {
    const error = noThrowSync(() => {
      throw new Error(":(");
    });
    assert(error instanceof Error);
    assert.equal(error.message, ":(");
  });

  test("throws an error if non-Error is thrown", () => {
    const error = noThrowSync(() => {
      throw "string error";
    });
    assert(error instanceof Error);
    assert.equal(error.message, "Non-Error thrown: string error");
  });
});
