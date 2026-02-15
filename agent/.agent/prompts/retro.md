---
description: Review session and propose agent instruction improvements
---

Review this session and propose improvements to the agent instructions.

Steps:
1. Read the current instruction files:
   - exec_command { command: "fd", args: ["^AGENTS.*\\.md$", "./", "--hidden", "--max-depth", "5"] }
   - Read each AGENTS.md file found.
   - Also check for SKILL.md files.

2. Reflect on this session's conversation:
   - Identify moments where the user corrected your behavior, pointed out mistakes, or gave feedback.
   - Identify patterns where you struggled, made wrong assumptions, or needed multiple attempts.
   - Identify any implicit conventions or preferences the user demonstrated.

3. Propose concrete improvements:
   - For each issue found, suggest a specific change to AGENTS.md, SKILL.md, or a new file.
   - Use patch_file or write_file to apply the changes (ask user for approval).
   - Focus on actionable rules and conventions, not vague guidelines.
   - Avoid duplicating instructions already present in the system prompt.

Output format:
- Start with a summary of observations (what went well, what didn't).
- Then list each proposed change with:
  - The problem or pattern observed
  - The target file
  - The specific addition or modification
