import assert from "node:assert";
import { describe, it } from "node:test";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";
import { isSafeRelativePath } from "./isSafeRelativePath.mjs";

describe("config", () => {
  describe("isSafeRelativePath", () => {
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
      {
        desc: "file in agent metadata directory",
        path: `${AGENT_PROJECT_METADATA_DIR}/request.md`,
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
        assert.strictEqual(isSafeRelativePath(path), expected);
      });
    }
  });

  describe("isSafeRelativePath with gitignore (using existing project files and .gitignore)", () => {
    const gitIgnoreTestCases = [
      // Ignored paths (based on project's .gitignore)
      // These should return false as they are potentially sensitive and should not be accessed
      {
        desc: "node_modules directory itself",
        path: "node_modules",
        expected: false,
      },
      { desc: ".secrets directory itself", path: ".secrets", expected: false },

      // Not ignored paths (common project files/dirs)
      // These should return true as they are safe to access
      { desc: "package.json file", path: "package.json", expected: true },
      { desc: "src/config.mjs file", path: "src/config.mjs", expected: true },
      { desc: "README.md file", path: "README.md", expected: true },
      { desc: "src directory itself", path: "src", expected: true },

      // Non-existent paths
      // These should return true as they pass the git-ignore check
      // (non-existent files can't be determined as ignored)
      {
        desc: "non-existent file in root",
        path: "this_file_does_not_exist.txt",
        expected: true,
      },
      {
        desc: "non-existent file in an ignored directory (node_modules)",
        path: "node_modules/this_file_does_not_exist.js",
        expected: false,
      },
      {
        desc: "non-existent file in a non-ignored directory (src)",
        path: "src/this_file_does_not_exist.mjs",
        expected: true,
      },
    ];

    for (const { desc, path: testPath, expected } of gitIgnoreTestCases) {
      it(`should return ${expected} for ${desc}: ${testPath}`, () => {
        assert.strictEqual(isSafeRelativePath(testPath), expected);
      });
    }
  });
});
