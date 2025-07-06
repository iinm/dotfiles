# Agent

A lightweight CLI-based coding agent designed to assist with your development tasks.

## Safety Controls

This CLI tool automatically permits certain tool executions but requires explicit approval for security-sensitive operations, such as accessing parent directories and git-ignored files. The security rules are defined in `src/config.mjs` within this repository.

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
      // AI Gateway example:
      // baseURL: "https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic",
      // customHeaders: { "cf-aig-metadata": JSON.stringify({ client: "agent-by-iinm" }) },
    },
    gemini: {
      apiKey: "FIXME",
      // AI Gateway example:
      // baseURL: "https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/google-ai-studio",
      // customHeaders: { "cf-aig-metadata": JSON.stringify({ client: "agent-by-iinm" }) },
    },
    openai: {
      apiKey: "FIXME",
      // AI Gateway example:
      // baseURL: "https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/openai",
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
# Use default model defined in config files
./bin/agent

# Or specify a specific model
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
  // Set default model used by ./bin/agent
  // See model.mjs for available models
  // model: "gemini-flash-thinking-16k",

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

  // Override default notification command
  // notifyCmd: "/path/to/notification-command"
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
