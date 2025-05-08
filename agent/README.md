# Agent

A lightweight CLI-based coding agent designed to assist with your development tasks.

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
./bin/agent-init --metadata-dir ~/agent-metadata/<project-name>
```

```sh
# Run agent
./bin/agent

# or
./bin/agent-<model>
```

## Usage

Once the agent is running, you can interact with it using various commands and keywords.

### Commands

These commands start with a slash (`/`):

- `/help` - Display the help message with available commands
- `/request` - Read the task request from `.agent/request.md`
- `/resume` - Resume conversation after an LLM provider error
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

The agent can save and retrieve information about tasks:

- `save memory` - Save the current task state to memory
- `resume work` - Load a previously saved task memory
- `update project memory` - Update the project-wide knowledge base

### Workflow Management

Workflows help automate repetitive tasks:

- `use workflow` - List and apply available workflows
- `save workflow` - Save current session steps as a reusable workflow

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
  .agent/ --> (link to metadata directory)
    request.md
    memory/
      project.md
      <yyyy-mm-dd-hhmm>--<task-title>.md
    workflows/
    tmp/
```

## Project Configuration

Configuration Example:
```js
// .agent/config.mjs
export default {
  allowedToolUsePatterns: [
    {
      toolName: "exec_command",
      input: { command: "npm", args: ["run", /(check|fix)/] },
    },
    { toolName: "web_search", input: { query: /./ } },
    {
      // Naming: mcp__<serverName>__<toolName>
      toolName: "mcp__fetch__fetch",
    },
    {
      toolName: /mcp__playwright__browser_.+/,
    },
  ],

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
