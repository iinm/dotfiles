# Agent

A lightweight CLI-based coding agent designed to assist with your development tasks.

## Safety Controls

This CLI tool automatically permits certain tool executions but requires explicit approval for security-sensitive operations, such as accessing absolute paths (to prevent unintended modification of system files or sensitive data outside the project scope), parent directories, and git-ignored files. The security rules are defined in `src/config.mjs` within this repository.

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
# Run agent with default model
./bin/agent

# or run with a specific model
./bin/agent-<model>
```

## Usage

```
/help
```

## Metadata Directory Structure

```
<project-root>
  \__ $AGENT_PROJECT_METADATA_DIR (default: .agent)
        \__ config.mjs  # Project-specific configuration
        \__ memory/
              \__ <yyyy-mm-dd-hhmm>--<task-title>.md  # Task-specific memory files
```

## Project Configuration

Customize the agent's behavior by creating a configuration file in your project's metadata directory.

Configuration Example:
```js
// $AGENT_PROJECT_METADATA_DIR/config.mjs
export default {
  // Define patterns for tools that can be used without explicit approval
  allowedToolUsePatterns: [
    // Allow npm run check|fix commands without confirmation
    {
      toolName: "exec_command",
      input: { command: "npm", args: ["run", /(check|fix)/] },
    },
    // Allow all web searches
    { toolName: "web_search", input: { query: /./ } },
    // Allow specific MCP tools
    {
      // Naming: mcp__<serverName>__<toolName>
      toolName: /mcp__playwright__browser_.+/,
    },
  ],

  // Configure MCP servers for extended functionality
  mcpServers: {
    perplexity: {
      command: "npx",
      args: ["-y", "server-perplexity-ask"],
      env: {
        PERPLEXITY_API_KEY: "FIXME",
      },
    },
    context7: {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
    },
    playwright: {
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
    },
    notion: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.notion.com/sse"],
      agentConfig: {
        // enable only specified tools
        enabledTools: ["search", "fetch"],
      },
    },
    atlassian: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/sse"],
    },
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
