---
description: Create a commit message with Co-authored-by trailer
---

Create a commit.
- Understand the staged changes: git ["diff", "--staged"]
- Check the commit message format: git ["log", "--no-merges", "--oneline", "-n", "10"]
- Create a concise and descriptive commit message that follows the project's commit convention.
- Create a commit:
  exec_command: git ["commit", "-m", "<commit message>", "-m", "", "-m", "Co-authored-by: Agent by iinm <agent-by-iinm+<model-name>@localhost>"]
