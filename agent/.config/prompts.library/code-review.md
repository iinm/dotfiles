---
import: https://raw.githubusercontent.com/anthropics/claude-code/db8834ba1d72e9a26fba30ac85f3bc4316bb0689/plugins/code-review/commands/code-review.md
---

- Parallel execution of subagents is not supported. Delegate to subagents sequentially.
- If CLAUDE.md is not found, refer to AGENTS.md instead for project rules and conventions.
- If the PR branch is already checked out, review changes from local files instead of fetching from GitHub.
- After explaining the review results to the user, ask whether to post the comments to GitHub as well.
