/**
 * @import { ToolUsePattern } from "./tool";
 */

import assert from "node:assert";
import fs from "node:fs/promises";
import test, { describe } from "node:test";
import { AGENT_ROOT } from "./env.mjs";
import { evalJSONConfig } from "./utils/evalJSONConfig.mjs";
import { matchValue } from "./utils/matchValue.mjs";

describe("predefined patterns from config.predefined.json", async () => {
  const content = await fs.readFile(
    `${AGENT_ROOT}/.config/config.predefined.json`,
    "utf-8",
  );
  const parsed = JSON.parse(content.replace(/^ *\/\/.+$/gm, ""));
  const config =
    /** @type {{ autoApproval?: { patterns?: ToolUsePattern[] } }} */ (
      evalJSONConfig(parsed)
    );
  const patterns = config.autoApproval?.patterns ?? [];

  const testCases = [
    {
      desc: "ls should be allowed",
      toolUse: { toolName: "exec_command", input: { command: "ls" } },
      action: "allow",
    },
    {
      desc: "rm should not match any pattern",
      toolUse: { toolName: "exec_command", input: { command: "rm" } },
      action: undefined,
    },
    {
      desc: "fd with safe args should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["--max-depth", "3"] },
      },
      action: "allow",
    },
    {
      desc: "fd with -H only should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["-H", "pattern"] },
      },
      action: "allow",
    },
    {
      desc: "fd with unsafe args should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["--unrestricted"] },
      },
      action: "ask",
    },
    {
      desc: "fd with -I option should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["-I", "pattern"] },
      },
      action: "ask",
    },
    {
      desc: "fd with -HI combined options should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["-HI", "pattern"] },
      },
      action: "ask",
    },
    {
      desc: "fd with -IH combined options should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["-IH", "pattern"] },
      },
      action: "ask",
    },
    {
      desc: "fd with -Hx=command combined options with value should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["-Hx=cat", "pattern"] },
      },
      action: "ask",
    },
    {
      desc: "rg with safe args should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "rg", args: ["--ignore-case", "pattern"] },
      },
      action: "allow",
    },
    {
      desc: "rg with -H only should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "rg", args: ["-H", "pattern"] },
      },
      action: "allow",
    },
    {
      desc: "rg with unsafe args should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "rg", args: ["--unrestricted"] },
      },
      action: "ask",
    },
    {
      desc: "rg with -u option should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "rg", args: ["-u", "pattern"] },
      },
      action: "ask",
    },
    {
      desc: "rg with -Hu combined options should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "rg", args: ["-Hu", "pattern"] },
      },
      action: "ask",
    },
    {
      desc: "rg with -uH combined options should be ask",
      toolUse: {
        toolName: "exec_command",
        input: { command: "rg", args: ["-uH", "pattern"] },
      },
      action: "ask",
    },
    {
      desc: "awk with known args pattern should be allowed #1",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ["FNR==10, FNR==-1 {print $0}", "file.txt"],
        },
      },
      action: "allow",
    },
    {
      desc: "awk with known args pattern should be allowed #2",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ['FNR==10, FNR==-1 {print FNR" ", $0}', "file.txt"],
        },
      },
      action: "allow",
    },
    {
      desc: "awk with single line print should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ["FNR==50 {print $0}", "file.txt"],
        },
      },
      action: "allow",
    },
    {
      desc: "awk with range condition should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ["FNR>=76 && FNR<=85 {print $0}", "file.txt"],
        },
      },
      action: "allow",
    },
    {
      desc: "awk with range condition and line numbers should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ["FNR>=76 && FNR<=85 {print FNR, $0}", "file.txt"],
        },
      },
      action: "allow",
    },
    {
      desc: "awk with simple range should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ["FNR>=76 && FNR<=85", "file.txt"],
        },
      },
      action: "allow",
    },
    {
      desc: "sed with known pattern should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "sed", args: ["-n", "10,20p", "file.txt"] },
      },
      action: "allow",
    },
    {
      desc: "sed with single line pattern should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "sed", args: ["-n", "42p", "file.txt"] },
      },
      action: "allow",
    },
    {
      desc: "git status should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "git", args: ["status"] },
      },
      action: "allow",
    },
    {
      desc: "git branch --show-current should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "git", args: ["branch", "--show-current"] },
      },
      action: "allow",
    },
    {
      desc: "git commit should not match any pattern",
      toolUse: {
        toolName: "exec_command",
        input: { command: "git", args: ["commit"] },
      },
      action: undefined,
    },
    {
      desc: "docker ps should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "docker", args: ["ps"] },
      },
      action: "allow",
    },
    {
      desc: "docker compose ps should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "docker", args: ["compose", "ps"] },
      },
      action: "allow",
    },
    {
      desc: "docker compose logs should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "docker", args: ["compose", "logs"] },
      },
      action: "allow",
    },
    {
      desc: "tmux list-sessions should be allowed",
      toolUse: {
        toolName: "tmux_command",
        input: { command: "list-sessions" },
      },
      action: "allow",
    },
    {
      desc: "gh --version should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "gh", args: ["--version"] },
      },
      action: "allow",
    },
    {
      desc: "gh auth status should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "gh", args: ["auth", "status"] },
      },
      action: "allow",
    },
    {
      desc: "gh pr view should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "gh", args: ["pr", "view"] },
      },
      action: "allow",
    },
    {
      desc: "gh api for PR comments should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "gh",
          args: ["api", "repos/owner/repo/pulls/123/comments"],
        },
      },
      action: "allow",
    },
  ];

  for (const { desc, toolUse, action } of testCases) {
    test(desc, () => {
      const matchedPattern = patterns.find((p) =>
        matchValue(toolUse, {
          toolName: p.toolName,
          ...(p.input !== undefined && { input: p.input }),
        }),
      );
      assert.strictEqual(matchedPattern?.action, action);
    });
  }
});
