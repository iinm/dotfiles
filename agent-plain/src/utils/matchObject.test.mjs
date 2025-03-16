import assert from "node:assert";
import test, { describe } from "node:test";
import { matchObject } from "./matchObject.mjs";

describe("matchObject", () => {
  test("matches object with string values", () => {
    // given:
    const object = { a: "apple", b: "banana" };
    const pattern = { a: "apple", b: "banana" };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, true);
  });

  test("does not match object with string values", () => {
    // given:
    const object = { a: "apple", b: "banana" };
    const pattern = { a: "apple", b: "orange" };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, false);
  });

  test("matches object with regexp values", () => {
    // given:
    const object = { a: "apple", b: "banana" };
    const pattern = { a: /^a/, b: /^b/ };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, true);
  });

  test("does not match object with regexp values", () => {
    // given:
    const object = { a: "apple", b: "banana" };
    const pattern = { a: /^b/, b: /^a/ };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, false);
  });

  test("matches object with function values", () => {
    // given:
    const object = { a: 1, b: 2 };
    const pattern = {
      a: (/** @type {unknown} */ value) =>
        typeof value === "number" && value > 0,
      b: (/** @type {unknown} */ value) =>
        typeof value === "number" && value > 0,
    };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, true);
  });

  test("does not match object with function values", () => {
    // given:
    const object = { a: 1, b: 2 };
    const pattern = {
      a: (/** @type {unknown} */ value) =>
        typeof value === "number" && value < 0,
      b: (/** @type {unknown} */ value) =>
        typeof value === "number" && value > 0,
    };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, false);
  });

  test("matches object with nested object pattern", () => {
    // given:
    const object = { a: { b: "banana" } };
    const pattern = { a: { b: "banana" } };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, true);
  });

  test("does not match object with nested object pattern", () => {
    // given:
    const object = { a: { b: "banana" } };
    const pattern = { a: { b: "orange" } };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, false);
  });

  test("does not match object with missing key", () => {
    // given:
    const object = { a: "apple" };
    const pattern = { a: "apple", b: "banana" };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, false);
  });

  test("matches object with array values", () => {
    // given:
    const object = { a: ["apple", "banana"] };
    const pattern = { a: ["apple", "banana"] };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, true);
  });

  test("does not match object with array values", () => {
    // given:
    const object = { a: ["apple", "banana"] };
    const pattern = { a: ["apple", "orange"] };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, false);
  });

  test("does not match object with missing array element", () => {
    // given:
    const object = { a: ["apple"] };
    const pattern = { a: ["apple", "banana"] };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, false);
  });

  test("matches object with array of regexp values", () => {
    // given:
    const object = { a: ["apple", "banana"] };
    const pattern = { a: [/^a/, /^b/] };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, true);
  });

  test("matches object with array of function values", () => {
    // given:
    const object = { a: [1, 2] };
    const pattern = {
      a: [
        (/** @type {unknown} */ value) =>
          typeof value === "number" && value > 0,
        (/** @type {unknown} */ value) =>
          typeof value === "number" && value > 0,
      ],
    };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, true);
  });

  test("matches object with array of objects", () => {
    // given:
    const object = { a: [{ b: "banana" }] };
    const pattern = { a: [{ b: "banana" }] };

    // when:
    const result = matchObject(object, pattern);

    // then:
    assert.equal(result, true);
  });
});
