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
// $AGENT_ROOT(where this README file exists)/.config/config.local.json
{
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
  "tools": {
    "tavily": {
      "apiKey": "(Optional) FIXME"
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
  "model": "Set default model",

  "permissions": {
    "allow": [
      {
        "toolName": "exec_command",
        "input": { "command": "npm", "args": ["run", { regex: "^(check|fix)$" }] }
      },
      {
        "toolName": "web_search",
        "input": { "query": { regex: "." } }
      },
      {
        "toolName": { regex: "mcp__playwright__browser_.+" }
      }
    ],

    "maxAutoApprovals": 30,

    "sandbox": {
      "command": "agent-sandbox",
      "args": ["--dockerfile", ".agent/sandbox/Dockerfile", "--allow-write", "--skip-build"],

      "rules": [
        {
          "pattern": {
            "toolName": "exec_command",
            "input": { "command": { regex: "^(gh|docker)$" } }
          },
          "mode": "unsandboxed"
        },
        {
          "pattern": {
            "command": "npm",
            "args": ["install"]
          },
          "mode": "sandbox",
          "extraArgs": ["--allow-net", "registry.npmjs.org"]
        }
      ]
    }
  },

  "tools": {
    "tavily": {
      "apiKey": "FIXME"
    }
  },

  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "server-perplexity-ask"],
      "env": {
        "PERPLEXITY_API_KEY": "FIXME"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
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
    },
    "atlassian": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/sse"]
    }
  },

  "notifyCmd": "/path/to/notification-command"
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
