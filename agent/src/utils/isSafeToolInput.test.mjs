import assert from "node:assert";
import { mkdir, rm, symlink } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { AGENT_PROJECT_METADATA_DIR } from "../env.mjs";
import { isSafeToolInput, isSafeToolInputItem } from "./isSafeToolInput.mjs";

const TEMP_DIR = path.resolve("tmp/is-safe-tool-input");

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
  const tmpSymlink = path.resolve(TEMP_DIR, "tmp");
  const agentTmpDir = path.resolve(AGENT_PROJECT_METADATA_DIR, "tmp");
  const symlinkInAllowedDir = path.resolve(agentTmpDir, "unsafe-symlink");
  const brokenSymlinkInAllowedDir = path.resolve(
    agentTmpDir,
    "broken-unsafe-symlink",
  );
  const brokenSymlinkOutside = path.resolve(TEMP_DIR, "broken-outside-symlink");
  const safeSymlinkInAllowedDir = path.resolve(
    agentTmpDir,
    "safe-symlink-inside",
  );
  const nestedSymlinkInAllowedDir = path.resolve(
    agentTmpDir,
    "nested-unsafe-symlink",
  );
  const circularSymlink = path.resolve(agentTmpDir, "circular-link");

  const midLink = path.resolve(TEMP_DIR, "mid-link");

  before(async () => {
    await rm(TEMP_DIR, { force: true, recursive: true });
    await rm(symlinkInAllowedDir, { force: true });
    await rm(brokenSymlinkInAllowedDir, { force: true });
    await rm(safeSymlinkInAllowedDir, { force: true });
    await rm(nestedSymlinkInAllowedDir, { force: true });
    await rm(circularSymlink, { force: true });

    await mkdir(TEMP_DIR, { recursive: true });
    await mkdir(agentTmpDir, { recursive: true });

    // Valid symlink to outside
    await symlink("/tmp", tmpSymlink);

    // Valid symlink in allowed dir to outside
    await symlink("/etc/passwd", symlinkInAllowedDir);

    // Broken symlink in allowed dir to outside
    await symlink("/non-existent-path-outside", brokenSymlinkInAllowedDir);

    // Broken symlink outside allowed dir to outside
    await symlink("/another-non-existent-outside", brokenSymlinkOutside);

    // Symlink in allowed dir to inside working directory
    await symlink(path.resolve("README.md"), safeSymlinkInAllowedDir);

    // Nested symlink: link1 -> link2 -> outside (broken)
    await symlink("/tmp/non-existent-nested", midLink);
    await symlink(midLink, nestedSymlinkInAllowedDir);

    // Circular symlink
    await symlink(circularSymlink, circularSymlink);
  });

  after(async () => {
    await rm(TEMP_DIR, { force: true, recursive: true });
    // Note: We don't remove AGENT_PROJECT_METADATA_DIR completely as it might be used by other things,
    // but we clean up our specific symlinks.
    await rm(symlinkInAllowedDir, { force: true });
    await rm(brokenSymlinkInAllowedDir, { force: true });
    await rm(safeSymlinkInAllowedDir, { force: true });
    await rm(nestedSymlinkInAllowedDir, { force: true });
    await rm(circularSymlink, { force: true });
  });

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
      desc: "symlink to outside the project directory",
      arg: tmpSymlink,
      expected: false,
    },
    {
      desc: "symlink in allowed directory (.agent/tmp) pointing outside",
      arg: symlinkInAllowedDir,
      expected: false,
    },
    {
      desc: "broken symlink in allowed directory (.agent/tmp) pointing outside",
      arg: brokenSymlinkInAllowedDir,
      expected: false,
    },
    {
      desc: "broken symlink outside pointing outside",
      arg: brokenSymlinkOutside,
      expected: false,
    },
    {
      desc: "symlink in allowed directory pointing inside",
      arg: safeSymlinkInAllowedDir,
      expected: true,
    },
    {
      desc: "nested symlink in allowed directory pointing outside (broken)",
      arg: nestedSymlinkInAllowedDir,
      expected: false,
    },
    {
      desc: "circular symlink in allowed directory",
      arg: circularSymlink,
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

    // Non-path arguments containing ".." or "..." should be allowed
    // as long as they are not path segments.
    {
      desc: "git revision range (contains ..)",
      arg: "main..HEAD",
      expected: true,
    },
    {
      desc: "git triple-dot revision range (contains ...)",
      arg: "feature...main",
      expected: true,
    },
  ];

  for (const { desc, arg, expected } of testCases) {
    it(`should return ${expected} for ${desc}: ${arg}`, () => {
      assert.strictEqual(isSafeToolInputItem(arg), expected);
    });
  }
});
