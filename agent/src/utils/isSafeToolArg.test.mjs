import assert from "node:assert";
import { describe, it } from "node:test";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";
import { isSafeToolArg } from "./isSafeToolArg.mjs";

describe("isSafeToolArg", () => {
  const testCases = [
    // Invalid types
    { desc: "number type", arg: 123, expected: false },

    // Non-path
    { desc: "command option", arg: "-l", expected: true },

    // Safe path
    {
      desc: "file in agent metadata directory",
      arg: `${AGENT_PROJECT_METADATA_DIR}/memory/foo.md`,
      expected: true,
    },
    {
      desc: "file in claude code command directory",
      arg: ".claude/commands/foo",
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
    { desc: "git ignored file", arg: "node_modules", expected: false },
  ];

  for (const { desc, arg, expected } of testCases) {
    it(`should return ${expected} for ${desc}: ${arg}`, () => {
      assert.strictEqual(isSafeToolArg(arg), expected);
    });
  }
});
