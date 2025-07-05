# Agent

A lightweight CLI-based coding agent designed to assist with your development tasks.

## Safety Controls

This CLI tool automatically permits certain tool executions but requires explicit approval for security-sensitive operations, such as accessing absolute paths (to prevent unintended modification of system files or sensitive data outside the project scope), parent directories, and git-ignored files. The security rules are defined in `src/config.mjs` within this repository.

## Requirements

- Node.js 22 or later
- Anthropic API key, OpenAI API key, or Gemini API key
- (Optional) Tavily API key

## Quick Start

Install the dependencies.

```sh
npm install
```

Create the user local configuration.

```js
// $AGENT_ROOT(where this README file exists)/.config/config.local.mjs
export default {
  providers: {
    anthropic: {
      apiKey: "FIXME",
      // AI Gateway
      // baseURL: "https://gateway.ai.cloudflare.com/v1/FIXME/default/anthropic",
      // customHeaders: { "cf-aig-metadata": JSON.stringify({ client: "agent-by-iinm" }) },
    },
    gemini: {
      apiKey: "FIXME",
      // baseURL: "https://gateway.ai.cloudflare.com/v1/FIXME/default/google-ai-studio",
      // customHeaders: { "cf-aig-metadata": JSON.stringify({ client: "agent-by-iinm" }) },
    },
    openai: {
      apiKey: "FIXME",
      // baseURL: "https://gateway.ai.cloudflare.com/v1/FIXME/default/openai",
      // customHeaders: { "cf-aig-metadata": JSON.stringify({ client: "agent-by-iinm" }) },
    },
  },
  tools: {
    // (Optional)
    tavily: {
      apiKey: "FIXME",
    },
  },
};
```

Run the agent.

```sh
./bin/agent-<model>
```

Show help message.

```
/help
```

## Directory Structure

```
$AGENT_ROOT (where this README file exists)
  \__ .config
        \__ config.mjs        # User configuration
        \__ config.local.mjs  # User local configuration (including secrets)

<project-root>
  \__ $AGENT_PROJECT_METADATA_DIR (default: .agent)
        \__ config.mjs        # Project-specific configuration
        \__ config.local.mjs  # Project-specific local configuration (including secrets)
        \__ memory/
              \__ <yyyy-mm-dd-hhmm>--<task-title>.md  # Task-specific memory files
```

## Configuration Format

```js
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
