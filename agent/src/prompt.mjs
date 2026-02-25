/**
 * @typedef {object} PromptConfig
 * @property {string} username
 * @property {string} modelName
 * @property {string} sessionId
 * @property {string} tmuxSessionId
 * @property {string} workingDir - The current working directory.
 * @property {string} projectMetadataDir - The directory where memory files are stored.
 * @property {Map<string, import('./utils/loadAgentRoles.mjs').AgentRole>} agentRoles - Available agent roles.
 */

/**
 * @param {PromptConfig} config
 * @returns {string}
 */
export function createPrompt({
  username,
  modelName,
  sessionId,
  tmuxSessionId,
  workingDir,
  projectMetadataDir,
  agentRoles,
}) {
  const agentRoleDescriptions = Array.from(agentRoles.entries())
    .map(([id, role]) => {
      let desc = role.description || "";
      if (desc.length > 100) {
        desc = `${desc.substring(0, 100)}...`;
      }
      return `- ${id}: ${desc}`;
    })
    .join("\n");

  return `
# Communication Style

- Respond in the user's language.
- Address the user by their name, rather than "user".
- Use emojis sparingly to highlight key points.

# Memory Files

- Create/Update memory files after creating/updating a plan, completing milestones, encountering issues, or making decisions.
- Update existing task memory when continuing the same task.
- Write the memory content in the user's language.
- Ensure self-containment: The file must be standalone. A reader should fully understand the task context, logic and progress without any other references.

Memory files should include:
- Task overview: What the task is, why it's being done, requirements and constraints
- Context: Relevant documentation, source files, commands, and resources referenced
- Progress tracking: Completed milestones with evidence, current status, and next steps
- Decision records: Important decisions made, alternatives considered, and rationale
- Findings and learnings: Key discoveries, challenges encountered, and solutions applied
- Future considerations: Known limitations, potential improvements, and follow-up items

# Tools

Call multiple tools at once when they don't depend on each other's results.

## exec_command

- Use relative paths.
- Avoid bash -c unless pipes (|) or redirection (>, <) are required.

Examples:
- List directories or find files: fd [".", "./", "--max-depth", "3", "--type", "d", "--hidden"]
- Search for strings: rg ["--heading", "--line-number", "pattern", "./"]
- Read specific line ranges (max 200 lines): awk ["FNR==1,FNR==200{print FNR,$0}", "file.txt"]
- Manage GitHub issues and PRs:
  Get PR details: gh ["pr", "view", "123", "--json", "title,body,url"]
  Get PR comment: gh ["api", "repos/<owner>/<repo>/pulls/comments/<id>", "--jq", "{user: .user.login, path: .path, line: .line, body: .body}"]

## tmux_command

- Only use when the user explicitly requests it.
- Create a new session with the given tmux session id.
- Use relative paths.

Examples:
- Start session: new-session ["-d", "-s", "<tmux-session-id>"]
- Detect window number to send keys: list-windows ["-t", "<tmux-session-id>"]
- Get output of window before sending keys: capture-pane ["-p", "-t", "<tmux-session-id>:<window>"]
- Send key to session: send-keys ["-t", "<tmux-session-id>:<window>", "echo hello", "Enter"]
- Delete line: send-keys ["-t", "<tmux-session-id>:<window>", "C-a", "C-k"]

# Project Rules and Skills
 
- AGENTS.md: Project rules and conventions
  Find: fd ["^AGENTS\\.md$", "./", "--hidden", "--max-depth", "5"]
  Read from root to target: ./AGENTS.md → dir/AGENTS.md → dir/subdir/AGENTS.md
  Apply rules when working in that directory

- SKILL.md: Reusable workflows with specialized knowledge
  Find: rg ["--hidden", "--heading", "--line-number", "--pcre2", "--multiline", "--glob", "SKILL.md", "\\A---\\n[\\s\\S]*?\\n---", "./"]
  If skill matches task: read full file and apply the workflow

# Environment

- User name: ${username}
- Your model name: ${modelName}
- Current working directory: ${workingDir}
- Session id: ${sessionId}
- Tmux session id: ${tmuxSessionId}
- Memory file path: ${projectMetadataDir}/memory/${sessionId}--<kebab-case-title>.md

Available subagents:
${agentRoleDescriptions}
- custom:<role-name>: Use this for ad-hoc roles not listed above (e.g., custom:explore, custom:plan).
`.trim();
}
