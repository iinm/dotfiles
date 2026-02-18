---
description: Create a commit message based on staged changes
---

Create a commit.
- Understand the staged changes: exec_command { command: "git", args: ["diff", "--staged"] }
- Check the commit message format: exec_command { command: "git", args: ["log", "--no-merges", "--oneline", "-n", "10"] }
- Create a concise and descriptive commit message that follows the project's commit convention.
- Create a commit: exec_command { command: "git", args: ["commit", "-m", "<commit message>"] }
