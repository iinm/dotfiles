import assert from "node:assert";
import { describe, it } from "node:test";
import { ensureSafeRelativePath } from "./config.mjs";

describe("config", () => {
  describe("ensureSafeRelativePath", () => {
    const testCases = [
      // Safe paths
      { desc: "simple file name", path: "file.txt", expected: true },
      { desc: "current directory file", path: "./file.txt", expected: true },
      { desc: "file in subdirectory", path: "dir/file.txt", expected: true },
      {
        desc: "file in nested subdirectory",
        path: "dir/subdir/file.txt",
        expected: true,
      },

      // Unsafe paths
      { desc: "absolute path", path: "/absolute/path", expected: false },
      {
        desc: "parent directory traversal",
        path: "../parent/path",
        expected: false,
      },
      {
        desc: "parent directory traversal within path",
        path: "dir/../other.txt",
        expected: false,
      },
      {
        desc: "double parent directory traversal",
        path: "dir/../../other.txt",
        expected: false,
      },
      { desc: "starts with ..", path: "../file.txt", expected: false },
      { desc: "starts with ../..", path: "../../file.txt", expected: false },

      // Invalid types
      { desc: "number type", path: 123, expected: false },
      { desc: "null type", path: null, expected: false },
      { desc: "undefined type", path: undefined, expected: false },
      { desc: "object type", path: {}, expected: false },
      { desc: "array type", path: [], expected: false },
    ];

    for (const { desc, path, expected } of testCases) {
      it(`should return ${expected} for ${desc}: ${path}`, () => {
        assert.strictEqual(ensureSafeRelativePath(path), expected);
      });
    }
  });
});
