# Agent

A lightweight CLI-based coding agent designed to assist with your development tasks.

## Requirements

- Node.js 22 or later
- Anthropic API key or OpenAI API key
- Tavily API key

## Setup

```sh
echo "$ANTHROPIC_API_KEY" > .secrets/anthropic-api-key.txt
echo "$OPENAI_API_KEY" > .secrets/openai-api-key.txt
echo "$GOOGLE_AI_STUDIO_API_KEY" > .secrets/google-ai-studio-api-key.txt
echo "$TAVILY_API_KEY" > .secrets/tavily-api-key.txt
```

## Getting Started

```sh
# Set up a metadata directory for storing memory, workflow files, and other resources.
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
  ],
};
```

## Development

```sh
# Install dev dependencies
npm install

# Run lint, typecheck, and test
npm run check

# Fix lint errors
npm run fix
# or
npm run fix-unsafe
```
