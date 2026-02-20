import assert from "node:assert";
import test, { describe } from "node:test";
import { createDefaultAllowedToolUsePatterns } from "./config.mjs";
import { matchValue } from "./utils/matchValue.mjs";

describe("createDefaultAllowedToolUsePatterns", () => {
  const tmuxSessionId = "test-session-123";
  const patterns = createDefaultAllowedToolUsePatterns({ tmuxSessionId });

  const execCommandTestCases = [
    {
      desc: "ls should be allowed",
      toolUse: { toolName: "exec_command", input: { command: "ls" } },
      isApproved: true,
    },
    {
      desc: "rm should not be allowed",
      toolUse: { toolName: "exec_command", input: { command: "rm" } },
      isApproved: false,
    },
    {
      desc: "fd with safe args should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["--max-depth", "3"] },
      },
      isApproved: true,
    },
    {
      desc: "fd with unsafe args should not be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "fd", args: ["--unrestricted"] },
      },
      isApproved: false,
    },
    {
      desc: "rg with safe args should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "rg", args: ["--ignore-case", "pattern"] },
      },
      isApproved: true,
    },
    {
      desc: "rg with unsafe args should not be allowed",
      toolUse: {
        toolName: "exec_command",
        input: { command: "rg", args: ["--unrestricted"] },
      },
      isApproved: false,
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
      isApproved: true,
    },
    {
      desc: "awk with known args pattern should be allowed #2",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ['FNR==10, FNR==-1 {print FNR" " $0}', "file.txt"],
        },
      },
      isApproved: true,
    },
    {
      desc: "awk with known args pattern should be allowed: FNR range",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ["FNR>=76 && FNR<=85 {print $0}", "file.txt"],
        },
      },
      isApproved: true,
    },
    {
      desc: "awk with unknown args pattern should not be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "awk",
          args: ["unknown pattern", "file.txt"],
        },
      },
      isApproved: false,
    },
    {
      desc: "git read-only command should be allowed: status",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "git",
          args: ["status"],
        },
      },
      isApproved: true,
    },
    {
      desc: "git read-only command should be allowed: branch --show-current",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "git",
          args: ["branch", "--show-current"],
        },
      },
      isApproved: true,
    },
    {
      desc: "git write command should not be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "git",
          args: ["push"],
        },
      },
      isApproved: false,
    },
    {
      desc: "docker read-only command should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "docker",
          args: ["ps"],
        },
      },
      isApproved: true,
    },
    {
      desc: "docker run command should not be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "docker",
          args: ["run"],
        },
      },
      isApproved: false,
    },
    {
      desc: "docker compose read-only command should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "docker",
          args: ["compose", "ps"],
        },
      },
      isApproved: true,
    },
    {
      desc: "docker compose up command should not be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "docker",
          args: ["compose", "up"],
        },
      },
      isApproved: false,
    },
    {
      desc: "gh read-only command should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "gh",
          args: ["pr", "view", "123"],
        },
      },
      isApproved: true,
    },
    {
      desc: "gh read comments command should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "gh",
          args: [
            "api",
            "repos/org-name/repo-name/pulls/864/comments",
            "--jq",
            ".[] | {id: .id, user: .user.login, body: .body}",
          ],
        },
      },
      isApproved: true,
    },
    {
      desc: "gh read specific comment command should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "gh",
          args: [
            "api",
            "repos/org-name/repo-name/pulls/comments/1111111111",
            "--jq",
            ".[] | {id: .id, user: .user.login, body: .body}",
          ],
        },
      },
      isApproved: true,
    },

    {
      desc: "gh pr create command should not be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "gh",
          args: ["pr", "create"],
        },
      },
      isApproved: false,
    },
    {
      desc: "sed read-only command (-n 1,10p) should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "sed",
          args: ["-n", "1,10p", "file.txt"],
        },
      },
      isApproved: true,
    },
    {
      desc: "sed read-only command (-n 1,10l) should be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "sed",
          args: ["-n", "1,10l", "file.txt"],
        },
      },
      isApproved: true,
    },
    {
      desc: "sed with unknown args pattern should not be allowed",
      toolUse: {
        toolName: "exec_command",
        input: {
          command: "sed",
          args: ["s/old/new/g", "file.txt"],
        },
      },
      isApproved: false,
    },
  ];

  for (const { desc, toolUse, isApproved } of execCommandTestCases) {
    test(`(exec_command) ${desc}`, () => {
      assert.strictEqual(
        patterns.some((p) => matchValue(toolUse, p)),
        isApproved,
      );
    });
  }

  const tmuxCommandTestCases = [
    {
      desc: "capture-pane with given session id should be allowed",
      toolUse: {
        toolName: "tmux_command",
        input: {
          command: "capture-pane",
          args: ["-p", "-t", `${tmuxSessionId}:0`],
        },
      },
      isApproved: true,
    },
    {
      desc: "capture-pane with unknown session id should not be allowed",
      toolUse: {
        toolName: "tmux_command",
        input: {
          command: "capture-pane",
          args: ["-p", "-t", "other-session:0"],
        },
      },
      isApproved: false,
    },
    {
      desc: "new-session with given session id and detach option should be allowed",
      toolUse: {
        toolName: "tmux_command",
        input: {
          command: "new-session",
          args: ["-d", "-s", tmuxSessionId],
        },
      },
      isApproved: true,
    },
    {
      desc: "new-session without detach option should not be allowed",
      toolUse: {
        toolName: "tmux_command",
        input: {
          command: "capture-pane",
          args: ["-p", "-t", "other-session:0"],
        },
      },
      isApproved: false,
    },
    {
      desc: "list-sessions should be allowed",
      toolUse: {
        toolName: "tmux_command",
        input: {
          command: "list-sessions",
        },
      },
      isApproved: true,
    },
  ];

  for (const { desc, toolUse, isApproved } of tmuxCommandTestCases) {
    test(`(tmux_command) ${desc}`, () => {
      assert.strictEqual(
        patterns.some((p) => matchValue(toolUse, p)),
        isApproved,
      );
    });
  }
});
