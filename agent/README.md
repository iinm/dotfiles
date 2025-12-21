# Agent

A lightweight CLI-based coding agent.

## Safety Controls

This CLI tool automatically allows the execution of certain tools but requires explicit approval for security-sensitive operations, such as accessing parent directories and git-ignored files. The security rules are defined in `src/config.mjs#createDefaultAllowedToolUsePatterns` and `src/utils/isSafeToolInput.mjs` within this repository.

## Requirements

- Node.js 22 or later
- API keys for LLM providers
- (Optional) Tavily API key

## Quick Start

Install the dependencies.

```sh
npm install
```

Create the configuration.

```js
// $AGENT_ROOT(where this README file exists)/.config/config.local.json
{
  // Set default model used by ./bin/agent
  // See src/model.mjs for available models
  "model": "<model-name>",

  "providers": {
    "anthropic": {
      "apiKey": "FIXME"

      // Or Vertex AI (Requires gcloud CLI to get authentication token)
      // "platform": "vertex-ai",
      // "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>",

      // (Optional) AI Gateway example:
      // "baseURL": "https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic",
      // "customHeaders": {
      //   "cf-aig-metadata": "{\"client\":\"agent-by-iinm\"}"
      // }
    },
    "gemini": {
      // Vertex AI (Requires gcloud CLI to get authentication token)
      "platform": "vertex-ai",
      "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>"

      // Or Google AI Studio
      // "apiKey": "FIXME"
    },
    "openai": {
      "apiKey": "FIXME"
    },
    "xai": {
      "apiKey": "FIXME"
    }
  },
  // Optional
  "tools": {
    "askGoogle": {
      // Vertex AI (Requires gcloud CLI to get authentication token)
      "platform": "vertex-ai",
      "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>"

      // Or Google AI Studio
      // "apiKey": "FIXME"
    },
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

Display the help message.

```
/help
```

Interrupt the agent while it's running by providing additional instructions:

```sh
./bin/agent-interrupt "Please stop and report the current progress and status"
```

## Available Tools

The agent can use the following tools to assist with tasks:

- **exec_command**: Run a command without shell interpretation.
- **write_file**: Write a file.
- **patch_file**: Patch a file.
- **reset_context**: Reset the conversation context to reduce noise and maintain performance. It reloads the task state from a specified memory file.
- **tmux_command**: Run a tmux command.
- **fetch_web_page**: Fetch and extract web page content from a given URL, returning it as Markdown.
- **fetch_web_page_with_browser**: Fetch and extract web page content from a given URL using a browser, returning it as Markdown. Can handle JavaScript-rendered content.
- **search_web**: Search the web for information (requires Tavily API key).
- **ask_google**: Ask Google a question using natural language (requires Gemini API key).

## Directory Structure

```
$AGENT_ROOT (where this README file exists)
  \__ .config
        \__ config.json        # User configuration
        \__ config.local.json  # User local configuration (including secrets)

<project-root>
  \__ $AGENT_PROJECT_METADATA_DIR (default: .agent)
        \__ config.json            # Project-specific configuration
        \__ config.local.json      # Project-specific local configuration (including secrets)
        \__ interrupt-message.txt  # Interrupt message consumed by the agent
        \__ memory/                # Task-specific memory files
        \__ sandbox/               # (Example) Sandbox configuration
        \__ instructions.md        # (Example) Task-specific instructions
```

## Configuration

The agent loads configuration files in the following order. Settings in later files will override those in earlier files.

- `$AGENT_ROOT/.config/config.json`: User configuration for all projects.
- `$AGENT_ROOT/.config/config.local.json`: User local configuration, typically for API keys.
- `$AGENT_PROJECT_METADATA_DIR/config.json`: Project-specific configuration.
- `$AGENT_PROJECT_METADATA_DIR/config.local.json`: Project-specific local configuration, typically for API keys or local development overrides.

### Example

```js
{
  "autoApproval": {
    "patterns": [
      {
        "toolName": "exec_command",
        "input": { "command": "npm", "args": ["run", { "regex": "^(check|fix)$" }] }
      },
      {
        "toolName": { "regex": "^(write_file|patch_file)$" },
        "input": { "filePath": { "regex": "^\\.agent/memory/.+\\.md$" } }
      },
      {
        "toolName": "reset_context",
        "input": { "memoryPath": { "regex": "^\\.agent/memory/.+\\.md$" } }
      },
      {
        "toolName": "ask_google",
      },
      // MCP Tool naming convention: mcp__<serverName>__<toolName>
      {
        "toolName": { "regex": "mcp__chrome_devtools__.+" }
      }
    ],

    // The maximum number of automatic approvals.
    "maxApprovals": 50
  },

  // (Optional) Sandbox environment for the exec_command and tmux_command tools
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
        "additionalArgs": ["--allow-net", "registry.npmjs.org"]
      }
    ]
  },

  // Configure MCP servers for extended functionality
  "mcpServers": {
    "chrome_devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated"]
    },
    "perplexity": {
      "command": "npx",
      "args": ["-y", "server-perplexity-ask"],
      "env": {
        "PERPLEXITY_API_KEY": "FIXME"
      }
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.notion.com/mcp"],
      "options": {
        // Enable only specific tools (optional - if not specified, all tools are enabled)
        "enabledTools": ["notion-search", "notion-fetch"]
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
npm run fix -- --unsafe

# Update dependencies
npx npm-check-updates -t minor -c 3
npx npm-check-updates -t minor -c 3 -u
```
