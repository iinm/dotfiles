# Agent

A lightweight CLI-based coding agent.

## Safety Controls

This CLI tool automatically allows the execution of certain tools but requires explicit approval for security-sensitive operations, such as accessing parent directories.

Note: The `write_file` and `patch_file` tools block direct access to git-ignored files. However, `exec_command` can access any files within the working directory. Use a sandbox for stronger isolation. The security rules are defined in `.config/config.predefined.json` and `src/toolInputValidator.mjs` within this repository.

## Requirements

- Node.js 22 or later
- LLM provider credentials (API keys, AWS SSO, gcloud CLI, or Azure CLI)
- (Optional) Tavily API key

## Quick Start

Install the dependencies.

```sh
npm install
```

<details>
<summary>Create the configuration.</summary>

```js
// $AGENT_ROOT(where this README file exists)/.config/config.local.json
{
  // Set default model used by ./bin/agent
  // e.g., "gpt-5.4-mini+thinking-high"
  // List available models: jq -r '.models[] | "\(.name)+\(.variant)"' .config/config.predefined.json
  "model": "<model>+<variant>",

  "platforms": [
    {
      "name": "anthropic",
      "variant": "default",
      "apiKey": "FIXME"
    },
    {
      "name": "gemini",
      "variant": "default",
      "apiKey": "FIXME"
    },
    {
      "name": "openai",
      "variant": "default",
      "apiKey": "FIXME"
    },
    {
      // Requires Azure CLI to get access token
      "name": "azure",
      "variant": "default",
      "baseURL": "https://<resource>.openai.azure.com/openai",
      // Optional
      "azureConfigDir": "/home/xxx/.azure-for-agent"
    },
    {
      "name": "bedrock",
      "variant": "default",
      "baseURL": "https://bedrock-runtime.<region>.amazonaws.com",
      "awsProfile": "FIXME"
    },
    {
      // Requires gcloud CLI to get authentication token
      "name": "vertex-ai",
      "variant": "default",
      "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project>/locations/<location>",
      // Optional
      "account": "<service_account_email>"
    },
    {
      "name": "openai",
      "variant": "ollama",
      "baseURL": "https://ollama.com",
      "apiKey": "FIXME"
    },
    {
      "name": "openai",
      "variant": "huggingface",
      "baseURL": "https://router.huggingface.co",
      "apiKey": "FIXME"
    },
    {
      "name": "openai",
      "variant": "xai",
      "apiKey": "FIXME"
    }
  ],

  // Optional
  "tools": {
    "askGoogle": {
      "model": "gemini-3-flash-preview"

      // Google AI Studio
      "apiKey": "FIXME"

      // Or use Vertex AI (Requires gcloud CLI to get authentication token)
      // "platform": "vertex-ai",
      // "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>",
      // "account": "FIXME"
    },
    "tavily": {
      "apiKey": "FIXME"
    }
  }
}
```
</details>

Run the agent.

```sh
# Use default model defined in config files
./bin/agent

# Or specify a specific model
./bin/agent -m <model>+<variant>
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
- **tmux_command**: Run a tmux command.
- **fetch_web_page**: Fetch and extract web page content from a given URL, returning it as Markdown.
- **search_web**: Search the web for information (requires Tavily API key).
- **ask_google**: Ask Google a question using natural language (requires Gemini API key).
- **delegate_to_subagent**: Delegate a subtask to a subagent. The agent switches to a subagent role within the same conversation, focusing on the specified goal.
- **report_as_subagent**: Report completion and return to the main agent. Used by subagents to communicate results and restore the main agent role. After reporting, the subagent's conversation history is removed from the context.

## Directory Structure

```
$AGENT_ROOT (where this README file exists)
  \__ .config
        \__ config.json        # User configuration
        \__ config.local.json  # User local configuration (including secrets)
        \__ prompts/           # Global/User-defined prompts
        \__ agents/            # Global/User-defined agent roles

<project-root>
  \__ $AGENT_PROJECT_METADATA_DIR (default: .agent)
        \__ config.json            # Project-specific configuration
        \__ config.local.json      # Project-specific local configuration (including secrets)
        \__ interrupt-message.txt  # Interrupt message consumed by the agent
        \__ memory/                # Task-specific memory files
        \__ prompts/               # Project-specific prompts
        \__ agents/                # Project-specific agent roles
```

## Configuration

The agent loads configuration files in the following order. Settings in later files will override those in earlier files.

- `$AGENT_ROOT/.config/config.json`: User configuration for all projects.
- `$AGENT_ROOT/.config/config.local.json`: User local configuration, typically for API keys.
- `$AGENT_PROJECT_METADATA_DIR/config.json`: Project-specific configuration.
- `$AGENT_PROJECT_METADATA_DIR/config.local.json`: Project-specific local configuration, typically for API keys or local development overrides.

### Example

<details>
<summary>YOLO mode example (requires sandbox for safety)</summary>

```js
{
  "autoApproval": {
    // Automatically deny unmatched tools instead of asking
    "defaultAction": "deny",
    // The maximum number of automatic approvals.
    "maxApprovals": 100,
    // Patterns are evaluated in order. First match wins.
    "patterns": [
      // Prohibit direct access to external URLs
      {
        "toolName": "fetch_web_page",
        "action": "deny",
        "reason": "Use ask_google instead"
      },
      {
        "toolName": { "$regex": "^(write_file|patch_file)$" },
        "action": "allow"
      },
      {
        "toolName": { "$regex": "^(exec_command|tmux_command)$" },
        "action": "allow"
      },
      {
        "toolName": "ask_google",
        "action": "allow"
      }

      // ⚠️ Never do this. fetch_web_page and mcp run outside the sandbox, so they can send anything externally.
      // {
      //   "toolName": { "$regex": "." },
      //   "action": "allow"
      // }
    ]
  },
  "sandbox": {
    "command": "agent-sandbox",
    "args": ["--dockerfile", ".agent/sandbox/Dockerfile", "--allow-write", "--skip-build", "--keep-alive", "30"],
    "separator": "--",
    "rules": [
      {
        "pattern": {
          "command": "npm",
          "args": ["ci"]
        },
        "mode": "sandbox",
        "extraArgs": ["--allow-net", "0.0.0.0/0"]
      }
    ]
  }
}
```
</details>

<details>
<summary>Full example</summary>

```js
{
  "autoApproval": {
    // The maximum number of automatic approvals.
    "maxApprovals": 50,
    // Patterns are evaluated in order. First match wins.
    "patterns": [
      {
        "toolName": { "$regex": "^(write_file|patch_file)$" },
        "input": { "filePath": { "$regex": "^\\.agent/memory/.+\\.md$" } },
        "action": "allow"
      },
      {
        "toolName": { "$regex": "^(write_file|patch_file)$" },
        "input": { "filePath": { "$regex": "^(\\./)?src/" } },
        "action": "allow"
      },

      // ⚠️ `npm run test` may execute arbitrary code and access git-ignored files.
      // It must be run in a sandbox.
      {
        "toolName": "exec_command",
        "input": { "command": "npm", "args": ["run", { "$regex": "^(check|test|lint|fix)$" }] },
        "action": "allow"
      },
      {
        "toolName": "ask_google",
        "action": "allow"
      },

      // MCP Tool naming convention: mcp__<serverName>__<toolName>
      {
        "toolName": { "$regex": "slack_(read|search)_.+" },
        "action": "allow"
      }
    ]
  },

  // (Optional) Sandbox environment for the exec_command and tmux_command tools
  // https://github.com/iinm/dotfiles/tree/main/agent-sandbox
  "sandbox": {
    "command": "agent-sandbox",
    "args": ["--dockerfile", ".agent/sandbox/Dockerfile", "--allow-write", "--skip-build", "--keep-alive", "30"],
    // separator is inserted between sandbox flags and the user command to prevent bypasses
    "separator": "--",

    "rules": [
      // Run specific commands outside the sandbox
      {
        "pattern": {
          "command": { "$regex": "^(gh|docker)$" }
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
    // ⚠️ Add this to config.local.json to avoid committing secrets to Git
    "slack": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.slack.com/mcp", "--header", "Authorization:Bearer FIXME"],
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.notion.com/mcp"],
      "options": {
        // Enable only specific tools (optional - if not specified, all tools are enabled)
        "enabledTools": ["notion-search", "notion-fetch"]
      }
    },
    "aws_knowledge": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://knowledge-mcp.global.api.aws"]
    },
    // ⚠️ Add this to config.local.json to avoid committing secrets to Git
    "google_developer-knowledge": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://developerknowledge.googleapis.com/mcp", "--header", "X-Goog-Api-Key:FIXME"]
    }
  },

  // Override default notification command
  // "notifyCmd": "/path/to/notification-command"
}
```
</details>

## Prompts

You can define reusable prompts in Markdown files. These are especially useful for common tasks like creating commit messages or conducting retrospectives.

### Prompt File Format

Prompts are Markdown files with a YAML frontmatter:

```md
---
description: Create a commit message based on staged changes
---
Review the staged changes and create a concise commit message following the conventional commits specification.
```

You can also import remote prompts with the `import` field:

```md
---
import: https://raw.githubusercontent.com/anthropics/claude-code/5cff78741f54a0dcfaeb11d29b9ea9a83f3882ff/plugins/feature-dev/commands/feature-dev.md
---
- Use memory file instead of TodoWrite
- Parallel execution of subagents is not supported. Delegate to subagents sequentially.
```

Remote prompts are fetched and cached locally. The local content will be appended to the imported content.

### Locations

The agent searches for prompts in the following directories:

- `$AGENT_ROOT/.config/prompts.predefined/` (Predefined prompts)
- `$AGENT_ROOT/.config/prompts/` (Global/User-defined prompts)
- `.agent/prompts/` (Project-specific prompts)
- `.claude/commands/` (Claude-specific commands, prefixed with `claude/`)
- `.claude/skills/` (Claude-specific skills, prefixed with `claude/skill/`)

The prompt ID is the relative path of the file without the `.md` extension. For example, `.agent/prompts/retro.md` becomes `/prompts:retro`.

### Shortcuts

Prompts located in a `shortcuts/` subdirectory (e.g., `.agent/prompts/shortcuts/review.md`) can be invoked directly as a top-level command (e.g., `/review`). This is useful for frequently used tasks. If a prompt is in a `shortcuts/` subdirectory, its ID is simplified by removing the `shortcuts/` prefix for use as a shortcut (e.g., `shortcuts/review` becomes `/review`).

## Subagents

Subagents are specialized agents that can be delegated specific tasks. They allow you to break down complex workflows into focused, manageable components.

### Subagent File Format

Subagent definitions are Markdown files with a YAML frontmatter:

```md
---
description: Simplifies and refines code for clarity and maintainability
---
You are a code simplifier. Your role is to refactor code while preserving its functionality.
```

You can also import remote subagent definitions with the `import` field:

```md
---
import: https://raw.githubusercontent.com/anthropics/claude-code/f7ab5c799caf2ec8c7cd1b99d2bc2f158459ef5e/plugins/pr-review-toolkit/agents/code-simplifier.md
---
Use AGENTS.md instead of CLAUDE.md in this project.
```

Remote subagents are fetched and cached locally. The local content will be appended to the imported content.

### Locations

The agent searches for subagent definitions in the following directories:

- `$AGENT_ROOT/.config/agents.predefined/` (Predefined agents)
- `$AGENT_ROOT/.config/agents/` (Global/User-defined agents)
- `.agent/agents/` (Project-specific agents)
- `.claude/agents/` (Claude-specific agents)

The subagent ID is the relative path of the file without the `.md` extension. For example, `.agent/agents/worker.md` becomes `worker`.

## Claude Code Plugin Support

Example:

```sh
git clone --depth 1 https://github.com/anthropics/claude-code .agent/claude-code-plugins/anthropics/claude-code
git clone --depth 1 https://github.com/awslabs/agent-plugins .agent/claude-code-plugins/awslabs/agent-plugins
```

```js
// .agent/config.json
{
  "claudeCodePlugins": [
    { "name": "pr-review-toolkit", "path": "anthropics/claude-code/plugins/pr-review-toolkit" },
    { "name": "aws-serverless", "path": "awslabs/agent-plugins/plugins/aws-serverless" }
  ]
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

## Appendix: Creating Least-Privilege Users for Cloud Providers

<details>
<summary>Amazon Bedrock</summary>

```sh
# IAM Identity Center 
identity_center_instance_arn="FIXME" # e.g., arn:aws:sso:::instance/ssoins-xxxxxxxxxxxxxxxx"
identity_store_id=FIXME
aws_account_id=FIXME

# Create a permission set
permission_set_arn=$(aws sso-admin create-permission-set \
  --instance-arn "$identity_center_instance_arn" \
  --name "BedrockForCodingAgent" \
  --description "Allows only Bedrock model invocation" \
  --query "PermissionSet.PermissionSetArn" --output text)

# Add a policy to the permission set
policy='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/*",
        "arn:aws:bedrock:*:*:inference-profile/*"
      ]
    }
  ]
}'

aws sso-admin put-inline-policy-to-permission-set \
  --instance-arn "$identity_center_instance_arn" \
  --permission-set-arn "$permission_set_arn" \
  --inline-policy "$policy"

# Create an SSO user
sso_user_name=FIXME
sso_user_email=FIXME
sso_user_family_name=FIXME
sso_user_given_name=FIXME

user_id=$(aws identitystore create-user \
  --identity-store-id "$identity_store_id" \
  --user-name "$sso_user_name" \
  --display-name "$sso_user_name" \
  --name "FamilyName=${sso_user_family_name},GivenName=${sso_user_given_name}" \
  --emails Value=${sso_user_email},Primary=true \
  --query "UserId" --output text)

# Associate the user, permission set, and account
aws sso-admin create-account-assignment \
  --instance-arn "$identity_center_instance_arn" \
  --target-id "$aws_account_id" \
  --target-type AWS_ACCOUNT \
  --permission-set-arn "$permission_set_arn" \
  --principal-type USER \
  --principal-id "$user_id"

# Verify the setup
aws configure sso
# profile: CodingAgent

profile=CodingAgent
aws sso login --profile "$profile"

echo '{"anthropic_version": "bedrock-2023-05-31", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello"}]}' > request.json

aws bedrock-runtime invoke-model \
  --model-id global.anthropic.claude-haiku-4-5-20251001-v1:0 \
  --body fileb://request.json \
  --profile "$profile" \
  --region ap-northeast-1 \
  response.json
```
</details>

<details>
<summary>Azure - Microsoft Foundry</summary>

```sh
resource_group=FIXME
account_name=FIXME # resource name

# Create a service principal
service_principal=$(az ad sp create-for-rbac --name "CodingAgentServicePrincipal" --skip-assignment)
echo "$service_principal"
app_id=$(echo "$service_principal" | jq -r .appId)

# Assign role permissions
# https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/role-based-access-control?view=foundry-classic#azure-openai-roles
resource_id=$(az cognitiveservices account show \
    --name "$account_name" \
    --resource-group "$resource_group" \
    --query id --output tsv)

az role assignment create \
  --role "Cognitive Services OpenAI User" \
  --assignee "$app_id" \
  --scope "$resource_id"

# Log in with the service principal
export app_secret=$(echo "$service_principal" | jq -r .password)
export tenant_id=$(echo "$service_principal" | jq -r .tenant)

export AZURE_CONFIG_DIR=$HOME/.azure-for-agent # Change the location to store credentials
az login --service-principal -u "$app_id" -p "$app_secret" --tenant "$tenant_id"
```
</details>

<details>
<summary>Google Cloud Vertex AI</summary>

```sh
project_id=FIXME
service_account_name=FIXME
service_account_email="${service_account_name}@${project_id}.iam.gserviceaccount.com"
your_account_email=FIXME

# Create a service account
gcloud iam service-accounts create "$service_account_name" \
  --project "$project_id" --display-name "Vertex AI Caller Service Account for Coding Agent"

# Grant permissions
gcloud projects add-iam-policy-binding "$project_id" \
  --member "serviceAccount:$service_account_email" \
  --role="roles/aiplatform.serviceAgent"

# Allow your account to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "$service_account_email" \
  --project "$project_id" \
  --member "user:$your_account_email" \
  --role "roles/iam.serviceAccountTokenCreator"

# Verify that tokens can be issued
gcloud auth print-access-token --impersonate-service-account "$service_account_email"
```
</details>
