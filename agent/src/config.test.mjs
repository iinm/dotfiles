import assert from "node:assert";
import { describe, it } from "node:test";
import { createDefaultAllowedToolUsePatterns } from "./config.mjs";
import { matchValue } from "./utils/matchValue.mjs";

describe("createDefaultAllowedToolUsePatterns", () => {
  const tmuxSessionId = "test-session-123";
  const patterns = createDefaultAllowedToolUsePatterns({ tmuxSessionId });

  it("allows harmless exec_command and rejects destructive ones", () => {
    const allow = { toolName: "exec_command", input: { command: "ls" } };
    const deny = { toolName: "exec_command", input: { command: "rm" } };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
      "ls should be allowed",
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
      "rm should be rejected",
    );
  });

  it("validates fd args: allow safe flags, reject unsafe flags", () => {
    const allow = {
      toolName: "exec_command",
      input: { command: "fd", args: ["--extension", "js"] },
    };
    const deny = {
      toolName: "exec_command",
      input: { command: "fd", args: ["--unrestricted"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("validates rg args: allow safe flags, reject unsafe flags", () => {
    const allow = {
      toolName: "exec_command",
      input: { command: "rg", args: ["-n", "pattern"] },
    };
    const deny = {
      toolName: "exec_command",
      input: { command: "rg", args: ["--no-ignore"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("validates awk pattern by regex (covering negative range)", () => {
    const allow = {
      toolName: "exec_command",
      input: {
        command: "awk",
        args: ["FNR==10, FNR==-1 {print $0}", "file.txt"],
      },
    };
    const deny = {
      toolName: "exec_command",
      input: { command: "awk", args: ["invalid pattern", "file.txt"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("includes git read-only commands and rejects write commands", () => {
    const allow = {
      toolName: "exec_command",
      input: { command: "git", args: ["status"] },
    };
    const deny = {
      toolName: "exec_command",
      input: { command: "git", args: ["push"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );

    // Also specifically allow: git branch --show-current
    const branch = {
      toolName: "exec_command",
      input: { command: "git", args: ["branch", "--show-current"] },
    };
    assert.strictEqual(
      patterns.some((p) => matchValue(branch, p)),
      true,
    );
  });

  it("validates docker commands", () => {
    const allow = {
      toolName: "exec_command",
      input: { command: "docker", args: ["ps"] },
    };
    const deny = {
      toolName: "exec_command",
      input: { command: "docker", args: ["run"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("validates docker compose commands", () => {
    const allow = {
      toolName: "exec_command",
      input: { command: "docker", args: ["compose", "ps"] },
    };
    const deny = {
      toolName: "exec_command",
      input: { command: "docker", args: ["compose", "up"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("validates gh pr commands", () => {
    const allow = {
      toolName: "exec_command",
      input: { command: "gh", args: ["pr", "view", "123"] },
    };
    const deny = {
      toolName: "exec_command",
      input: { command: "gh", args: ["pr", "create"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("validates sed read-only print pattern", () => {
    const allow = {
      toolName: "exec_command",
      input: { command: "sed", args: ["-n", "1,10p", "file.txt"] },
    };
    const deny = {
      toolName: "exec_command",
      input: { command: "sed", args: ["s/old/new/g", "file.txt"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("validates tmux capture-pane target session", () => {
    const allow = {
      toolName: "tmux_command",
      input: {
        command: "capture-pane",
        args: ["-p", "-t", `${tmuxSessionId}:0`],
      },
    };
    const deny = {
      toolName: "tmux_command",
      input: { command: "capture-pane", args: ["-p", "-t", "other-session:0"] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("validates tmux new-session args", () => {
    const allow = {
      toolName: "tmux_command",
      input: { command: "new-session", args: ["-d", "-s", tmuxSessionId] },
    };
    const deny = {
      toolName: "tmux_command",
      input: { command: "new-session", args: ["-s", tmuxSessionId] },
    };

    assert.strictEqual(
      patterns.some((p) => matchValue(allow, p)),
      true,
    );
    assert.strictEqual(
      patterns.some((p) => matchValue(deny, p)),
      false,
    );
  });

  it("allows tmux list commands", () => {
    const listSessions = {
      toolName: "tmux_command",
      input: { command: "list-sessions" },
    };
    assert.strictEqual(
      patterns.some((p) => matchValue(listSessions, p)),
      true,
    );
  });
});
