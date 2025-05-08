# Agent

A lightweight CLI-based coding agent designed to assist with your development tasks.

## Safety Controls

This CLI tool automatically permits certain tool executions but requires explicit approval for security-sensitive operations. These include accessing absolute paths, parent directories, and git-ignored files. The security rules are defined in `src/config.mjs` within this repository.

## Requirements

- Node.js 22 or later
- Anthropic API key, OpenAI API key, or Gemini API key
- (Optional) Tavily API key

## Setup

```sh
# Install dependencies
npm install
```

```sh
# Create secrets directory
mkdir -p .secrets

# Configure API keys (set at least one of the following)
echo "$ANTHROPIC_API_KEY" > .secrets/anthropic-api-key.txt
# OR
echo "$OPENAI_API_KEY" > .secrets/openai-api-key.txt
# OR
echo "$GEMINI_API_KEY" > .secrets/gemini-api-key.txt

# (Optional)
echo "$TAVILY_API_KEY" > .secrets/tavily-api-key.txt
```

## Getting Started

```sh
# (Optional) Set up a metadata directory for storing memory, workflow files, and other resources.
./bin/agent-setup-project --metadata-dir ~/agent-metadata/<project-name>
```

```sh
# Run agent with default model
./bin/agent

# or run with a specific model
./bin/agent-<model>
```

## Usage

### Commands

These commands start with a slash (`/`):

- `/help` - Display the help message with available commands
- `/request` - Read the task request from `.agent/request.md`
- `/resume` - Resume conversation after an LLM provider error or unexpected interruption
- `/clear` - Clear conversation history (keeping only the system message)

### Debug Commands

- `/debug.msg.pop` - Remove the last message from the conversation
- `/debug.msg.dump` - Save current messages to a JSON file
- `/debug.msg.load` - Load messages from a JSON file

### Conversation Keywords

These are natural language phrases you can use in conversation:

- `commit` - Create a commit message based on staged changes
- `bye` or `exit` - End the session and clean up resources (including tmux sessions)

### Memory Management

The agent can save and retrieve information about tasks, helping maintain context across sessions:

- `save memory` - Save the current task state to a dated memory file in `.agent/memory/`
- `resume work` - List and load a previously saved task memory to continue where you left off
- `update project memory` - Add or modify information in the project-wide knowledge base (`.agent/memory/project.md`)

Memory files contain structured information about tasks, including the problem description, implementation plan, current status, and notes for future reference.

### Workflow Management

Workflows help automate repetitive tasks by providing reusable templates:

- `use workflow` - List available workflows in `.agent/workflows/` and apply one to your current task
- `save workflow` - Save the current session's approach and steps as a reusable workflow for similar future tasks

Workflows are stored as Markdown files with clear titles, descriptions, and step-by-step instructions that the agent can follow.

### Example Session

```
> /request
<The agent displays the content of your request.md file>

> Can you help me implement this feature?
<The agent analyzes the request and provides a plan>

> save memory
<The agent saves the current task state>

...

> commit
<The agent generates a commit message based on staged changes>

> bye
<The agent cleans up and exits>
```

## Metadata Directory Structure

```
<project-root>
  \__ .agent/ --> (link to metadata directory)
        \__ config.mjs         # Project-specific configuration
        \__ request.md         # Task description for the agent
        \__ memory/
              \__ project.md   # Project-wide knowledge base
              \__ <yyyy-mm-dd-hhmm>--<task-title>.md  # Task-specific memory files
        \__ workflows/         # Reusable workflow definitions
```

## Project Configuration

You can customize the agent's behavior by creating a configuration file in your project's metadata directory.

Configuration Example:
```js
// .agent/config.mjs
export default {
  // Define patterns for tools that can be used without explicit approval
  allowedToolUsePatterns: [
    // Allow npm run check/fix commands without confirmation
    {
      toolName: "exec_command",
      input: { command: "npm", args: ["run", /(check|fix)/] },
    },
    // Allow all web searches
    { toolName: "web_search", input: { query: /./ } },
    // Allow specific MCP tools
    {
      // Naming: mcp__<serverName>__<toolName>
      toolName: "mcp__fetch__fetch",
    },
    {
      toolName: /mcp__playwright__browser_.+/,
    },
  ],

  // Configure MCP servers for extended functionality
  mcpServers: {
    fetch: {
      command: "docker",
      args: ["run", "-i", "--rm", "mcp/fetch"],
    },
    playwright: {
      command: "npx",
      args: [
        "@playwright/mcp@latest"
      ]
    }
  },
};
```

## Development

```sh
# Run lint, typecheck, and test
npm run check

# Fix lint errors
npm run fix
# or
npm run fix-unsafe
```
