import assert from "node:assert";
import { describe, it } from "node:test";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";
import { isSafeToolInput, isSafeToolInputItem } from "./isSafeToolInput.mjs";

describe("isSafeToolInput", () => {
  const safePath = "README.md";
  const unsafePath = "../parent-file";

  const testCases = [
    { desc: "number", arg: 123, expected: true },
    { desc: "boolean", arg: true, expected: true },
    { desc: "undefined", arg: undefined, expected: true },
    { desc: "null", arg: null, expected: true },
    { desc: "safe string", arg: safePath, expected: true },
    { desc: "unsafe string", arg: unsafePath, expected: false },
    { desc: "empty array", arg: [], expected: true },
    { desc: "array of safe items", arg: [safePath, "-l", 1], expected: true },
    {
      desc: "array with an unsafe item",
      arg: [safePath, unsafePath],
      expected: false,
    },
    { desc: "empty object", arg: {}, expected: true },
    {
      desc: "object with safe values",
      arg: { a: safePath, b: "-l", c: 0 },
      expected: true,
    },
    {
      desc: "object with an unsafe nested value",
      arg: { a: [safePath, { b: unsafePath }] },
      expected: false,
    },
    { desc: "function (not allowed)", arg: () => {}, expected: false },
  ];

  for (const { desc, arg, expected } of testCases) {
    it(`should return ${expected} for ${desc}`, () => {
      assert.strictEqual(isSafeToolInput(arg), expected);
    });
  }
});

describe("isSafeToolInputItem", () => {
  const testCases = [
    // Non-path
    { desc: "command option", arg: "-l", expected: true },

    // Safe path
    {
      desc: "file in agent metadata directory",
      arg: `${AGENT_PROJECT_METADATA_DIR}/memory/foo.md`,
      expected: true,
    },
    { desc: "git managed file", arg: "README.md", expected: true },

    // Unsafe path
    {
      desc: "file outside the project directory",
      arg: "/absolute/path",
      expected: false,
    },
    {
      desc: "parent directory traversal",
      arg: "../parent-file",
      expected: false,
    },
    {
      desc: "safe path with unneeded parent directory reference",
      arg: `${AGENT_PROJECT_METADATA_DIR}/../${AGENT_PROJECT_METADATA_DIR}/memory/foo.md`,
      expected: false,
    },
    {
      desc: "parent directory traversal; start with safe path",
      arg: `${AGENT_PROJECT_METADATA_DIR}/../../parent-file`,
      expected: false,
    },
    { desc: "git ignored file", arg: "node_modules", expected: false },
  ];

  for (const { desc, arg, expected } of testCases) {
    it(`should return ${expected} for ${desc}: ${arg}`, () => {
      assert.strictEqual(isSafeToolInputItem(arg), expected);
    });
  }
});
