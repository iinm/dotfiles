---
import: https://raw.githubusercontent.com/anthropics/claude-plugins-official/b36fd4b753018b0b340803579399992a32e43502/plugins/code-review/commands/code-review.md
---

- Parallel execution of subagents is not supported. Delegate to subagents sequentially.
- If CLAUDE.md is not found, refer to AGENTS.md instead for project rules and conventions.
- If the PR branch is already checked out, review changes from local files instead of fetching from GitHub.
- After explaining the review results to the user, ask whether to post the comments to GitHub as well.
