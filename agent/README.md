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
