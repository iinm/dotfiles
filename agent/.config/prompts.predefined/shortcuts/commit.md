---
description: Create a commit message based on staged changes
---

Create a commit.
- Understand the staged changes: git ["diff", "--staged"]
- Check the commit message format: git ["log", "--no-merges", "--oneline", "-n", "10"]
- Create a concise and descriptive commit message that follows the project's commit convention.
- Create a commit: git ["commit", "-m", "<commit message>"]
