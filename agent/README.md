# Agent

A lightweight CLI-based coding agent designed to assist with your development tasks.

## Safety Controls

This CLI tool automatically permits certain tool executions but requires explicit approval for security-sensitive operations, such as accessing parent directories and git-ignored files. The security rules are defined in `src/config.mjs#createDefaultAllowedToolUsePatterns` and `src/utils/isSafeToolInput.mjs#isSafeToolInputItem` within this repository.

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
// $AGENT_ROOT(where this README file exists)/.config/config.local.json
{
  // Set default model used by ./bin/agent
  // See src/model.mjs for available models
  "model": "<model-name>",

  "providers": {
    "anthropic": {
      "apiKey": "FIXME",
      // (Optional) AI Gateway example:
      // "baseURL": "https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic",
      // "customHeaders": {
      //   "cf-aig-metadata": "{\"client\":\"agent-by-iinm\"}"
      // }
    },
    "gemini": {
      "apiKey": "FIXME",
    },
    "openai": {
      "apiKey": "FIXME",
    }
  },
  // Optional
  "tools": {
    "tavily": {
      "apiKey": "FIXME"
    }
  }
}
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
        \__ config.json        # User configuration
        \__ config.local.json  # User local configuration (including secrets)

<project-root>
  \__ $AGENT_PROJECT_METADATA_DIR (default: .agent)
        \__ config.json        # Project-specific configuration
        \__ config.local.json  # Project-specific local configuration (including secrets)
        \__ memory/
              \__ <yyyy-mm-dd-hhmm>--<task-title>.md  # Task-specific memory files
```

## Configuration

Agent loads configuration files in the following order. Settings in later files will override those in earlier files.

- `$AGENT_ROOT/.config/config.json`: User configuration for all projects.
- `$AGENT_ROOT/.config/config.local.json`: User local configuration, typically for sensitive information.
- `$AGENT_PROJECT_METADATA_DIR/config.json`: Project-specific configuration.
- `$AGENT_PROJECT_METADATA_DIR/config.local.json`: Project-specific local configuration, typically for sensitive information or local development overrides.

### Format

```js
{
  "autoApproval": {
    "patterns": [
      {
        "toolName": "exec_command",
        "input": { "command": "npm", "args": ["run", { "regex": "^(check|fix)$" }] }
      },
      {
        "toolName": "web_search",
      },
      {
        "toolName": { "regex": "mcp__playwright__browser_.+" }
      }
    ],

    // The maximum number of automatic approvals.
    "max": 30
  },

  // (Optional) Sandbox environment
  // https://github.com/iinm/dotfiles/tree/main/agent-sandbox
  "sandbox": {
    "command": "agent-sandbox",
    "args": ["--dockerfile", ".agent/sandbox/Dockerfile", "--allow-write", "--skip-build"],

    "rules": [
      // Run specific commands outside the sandbox
      {
        "pattern": {
          "command": { "regex": "^(gh|docker)$" }
        },
        "mode": "unsandboxed"
      },
      // Run commands in the sandbox with network access
      {
        "pattern": {
          "command": "npm",
          "args": ["install"]
        },
        "mode": "sandbox",
        // Allow access to registry.npmjs.org
        "extraArgs": ["--allow-net", "registry.npmjs.org"]
      }
    ]
  },

  // Configure MCP servers for extended functionality
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "server-perplexity-ask"],
      "env": {
        "PERPLEXITY_API_KEY": "FIXME"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.notion.com/sse"],
      "options": {
        "enabledTools": ["search", "fetch"]
      }
    }
  },

  // Override default notification command
  // "notifyCmd": "/path/to/notification-command"
}
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
