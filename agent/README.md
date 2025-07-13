# Agent

A lightweight CLI-based coding agent designed to assist with your development tasks.

## Safety Controls

This CLI tool automatically permits certain tool executions but requires explicit approval for security-sensitive operations, such as accessing parent directories and git-ignored files. The security rules are defined in `src/config.mjs#createDefaultAllowedToolUsePatterns` within this repository.

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

// (Optional) AI Gateway example:
const customHeaders = {
  "cf-aig-authorization": "Bearer FIXME",
  "cf-aig-collect-log": false, // Collect token and cost metrics, but do not log the message content.
  "cf-aig-metadata": JSON.stringify({
    client: "agent-by-iinm",
  }),
};

export default {
  providers: {
    anthropic: {
      apiKey: "FIXME",
      // (Optional) AI Gateway example:
      // baseURL: "https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic",
      // customHeaders,
    },
    gemini: {
      apiKey: "FIXME",
    },
    openai: {
      apiKey: "FIXME",
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

## Configuration

Agent loads configuration files in the following order. Settings in later files will override those in earlier files.

- `$AGENT_ROOT/.config/config.mjs`: User configuration for all projects.
- `$AGENT_ROOT/.config/config.local.mjs`: User local configuration, typically for sensitive information.
- `$AGENT_PROJECT_METADATA_DIR/config.mjs`: Project-specific configuration.
- `$AGENT_PROJECT_METADATA_DIR/config.local.mjs`: Project-specific local configuration, typically for sensitive information or local development overrides.

### Format

```js
const sandbox = {
  command: "docker-sandbox",
  args: ["--dockerfile", ".agent/Dockerfile.sandbox", "--volume", "node_modules"],
};

export default {
  // Set default model used by ./bin/agent
  // See model.mjs for available models
  // model: "gemini-flash-thinking-16k",

  // Define patterns for tools that can be used without explicit approval
  permissions: {
    allow: [
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

    // The maximum number of automatic approvals.
    maxAutoApprovals: 30, 

    // Rewrite tool use
    rewrite: [
      {
        pattern: {
          toolName: "exec_command",
          input: { command: "npm", args: ["install"] },
        },
        rewrite: (toolUse) => ({
          toolName: "exec_command",
          input: {
            command: sandbox.command,
            args: [
              ...sandbox.args, "--allow-net", "--allow-write",
              toolUse.input.command, ...toolUse.input.args,
            ],
          },
        }),
      },
    ],
  },

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
      options: {
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
