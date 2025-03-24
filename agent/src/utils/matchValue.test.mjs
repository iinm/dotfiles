import assert from "node:assert";
import test, { describe } from "node:test";
import { matchValue } from "./matchValue.mjs";

describe("matchValue", () => {
  const testCases = [
    {
      desc: "same string",
      value: "foo",
      pattern: "foo",
      expected: true,
    },
    {
      desc: "different string",
      value: "foo",
      pattern: "bar",
      expected: false,
    },
    {
      desc: "string and regex",
      value: "foo",
      pattern: /foo/,
      expected: true,
    },
    {
      desc: "string and unmatching regex",
      value: "foo",
      pattern: /bar/,
      expected: false,
    },
    {
      desc: "string and function",
      value: "foo",
      pattern: (/** @type {unknown} */ v) => v === "foo",
      expected: true,
    },
    {
      desc: "string and unmatching function",
      value: "foo",
      pattern: (/** @type {unknown} */ v) => v === "bar",
      expected: false,
    },
    {
      desc: "array and array",
      value: ["foo", "bar"],
      pattern: ["foo", "bar"],
      expected: true,
    },
    {
      desc: "array and unmatching array",
      value: ["foo", "bar"],
      pattern: ["bar", "foo"],
      expected: false,
    },
    {
      desc: "object and object",
      value: { foo: "bar" },
      /** @type {Record<string, string>} */
      pattern: { foo: "bar" },
      expected: true,
    },
    {
      desc: "object and unmatching object",
      value: { foo: "bar" },
      /** @type {Record<string, string>} */
      pattern: { bar: "foo" },
      expected: false,
    },
  ];

  for (const { value, pattern, expected } of testCases) {
    test(`should return ${expected} for ${value} and ${pattern}`, () => {
      assert.strictEqual(matchValue(value, pattern), expected);
    });
  }
});
