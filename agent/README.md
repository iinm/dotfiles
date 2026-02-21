# Agent

A lightweight CLI-based coding agent.

## Safety Controls

This CLI tool automatically allows the execution of certain tools but requires explicit approval for security-sensitive operations, such as accessing parent directories and git-ignored files. The security rules are defined in `src/config.mjs#createDefaultAllowedToolUsePatterns` and `src/utils/isSafeToolInput.mjs` within this repository.

## Requirements

- Node.js 22 or later
- LLM provider credentials (API keys, AWS SSO, gcloud CLI, or Azure CLI)
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

      // Or use Bedrock + AWS SSO
      // "platform": "bedrock",
      // "baseURL": "https://bedrock-runtime.<region>.amazonaws.com",
      // "bedrock": {
      //   "awsProfile": "FIXME"
      // },
      // "modelMap": {
      //   "claude-haiku-4-5": "<region>.anthropic.claude-haiku-4-5-20251001-v1:0",
      //   "claude-sonnet-4-5": "<region>.anthropic.claude-sonnet-4-5-20250929-v1:0",
      //   "claude-opus-4-6": "<region>.anthropic.claude-opus-4-6-v1"
      // }

      // Or use Vertex AI (Requires gcloud CLI to get authentication token)
      // "platform": "vertex-ai",
      // "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>",
      // "modelMap": {
      //   "claude-haiku-4-5": "claude-haiku-4-5@20251001",
      //   "claude-sonnet-4-5": "claude-sonnet-4-5@20250929",
      //   "claude-opus-4-6": "claude-opus-4-6"
      // }

      // (Optional) AI Gateway example:
      // "baseURL": "https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic",
      // "customHeaders": {
      //   "cf-aig-metadata": "{\"client\":\"agent-by-iinm\"}"
      // }
    },
    "gemini": {
      // Google AI Studio
      "apiKey": "FIXME"

      // Or use Vertex AI (Requires gcloud CLI to get authentication token)
      // "platform": "vertex-ai",
      // "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>"
      // "vertexAI": {
      //   "account": "FIXME"
      // }
    },
    "openai": {
      "apiKey": "FIXME"

      // Or use Azure (Requires Azure CLI to get access token)
      // "platform": "azure",
      // "baseURL": "https://<resource>.openai.azure.com/openai",
      // "modelMap": {
      //   "gpt-5.2-chat-latest": "gpt-5.2-chat"
      // },
      // "azure": {
      //   "azureConfigDir": "/home/xxx/.azure-for-agent"
      // }
    }
  },
  // Optional
  "tools": {
    "askGoogle": {
      // Google AI Studio
      "apiKey": "FIXME"

      // Or use Vertex AI (Requires gcloud CLI to get authentication token)
      // "platform": "vertex-ai",
      // "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>",
      // "account": "FIXME",
      // "model": "gemini-3-flash-preview"
    },
    "tavily": {
      "apiKey": "FIXME"
    }
  }
}
```

<details>
<summary>Other Supported Providers</summary>

```js
{
  "providers": {
    "deepseek": {
      "platform": "bedrock",
      "baseURL": "https://bedrock-runtime.<region>.amazonaws.com",
      "bedrock": {
        "awsProfile": "FIXME"
      },
      "modelMap": {
        "deepseek-v3.2": "deepseek.v3.2"
      }

      // Or use Vertex AI
      // "platform": "vertex-ai",
      // "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>",
      // "modelMap": {
      //   "deepseek-v3.2": "deepseek-ai/deepseek-v3.2-maas"
      // }
    },
    "minimax": {
      "platform": "bedrock",
      "baseURL": "https://bedrock-runtime.<region>.amazonaws.com",
      "bedrock": {
        "awsProfile": "FIXME"
      },
      "modelMap": {
        "MiniMax-M2.1": "minimax.minimax-m2.1"
      }
    },
    "moonshotai": {
      "platform": "bedrock",
      "baseURL": "https://bedrock-runtime.<region>.amazonaws.com",
      "bedrock": {
        "awsProfile": "FIXME"
      },
      "modelMap": {
        "kimi-k2.5": "moonshotai.kimi-k2.5"
      }
    },
    "qwen": {
      "platform": "bedrock",
      "baseURL": "https://bedrock-runtime.<region>.amazonaws.com",
      "bedrock": {
        "awsProfile": "FIXME"
      },
      "modelMap": {
        "qwen3-next-80b-a3b": "qwen.qwen3-next-80b-a3b"
      }
    },
    "zai": {
      "platform": "vertex-ai",
      "baseURL": "https://aiplatform.googleapis.com/v1beta1/projects/<project_id>/locations/<location>",
      "modelMap": {
        "glm-5": "zai-org/glm-5-maas"
      }

      // Or use Bedrock
      // "platform": "bedrock",
      // "baseURL": "https://bedrock-runtime.<region>.amazonaws.com",
      // "bedrock": {
      //   "awsProfile": "FIXME"
      // },
      // "modelMap": {
      //   "glm-4.7": "zai.glm-4.7"
      // }
    },
    "xai": {
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
- **tmux_command**: Run a tmux command.
- **fetch_web_page**: Fetch and extract web page content from a given URL, returning it as Markdown.
- **fetch_web_page_with_browser**: Fetch and extract web page content from a given URL using a browser, returning it as Markdown. Can handle JavaScript-rendered content.
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

<project-root>
  \__ $AGENT_PROJECT_METADATA_DIR (default: .agent)
        \__ config.json            # Project-specific configuration
        \__ config.local.json      # Project-specific local configuration (including secrets)
        \__ interrupt-message.txt  # Interrupt message consumed by the agent
        \__ memory/                # Task-specific memory files
        \__ prompts/               # Project-specific prompts
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
        "input": { "command": "grep" },
        "action": "deny",
        "reason": "Use rg"
      },
      {
        "toolName": "exec_command",
        "input": { "command": "find" },
        "action": "deny",
        "reason": "Use fd"
      },
      {
        "toolName": "exec_command",
        "input": { "command": "npm", "args": ["run", { "regex": "^(check|fix)$" }] }
      },
      {
        "toolName": { "regex": "^(write_file|patch_file)$" },
        "input": { "filePath": { "regex": "^\\.agent/memory/.+\\.md$" } }
      },
      {
        "toolName": { "regex": "^(delegate_to_subagent|report_as_subagent)$" }
      },
      {
        "toolName": "ask_google",
      },
      // MCP Tool naming convention: mcp__<serverName>__<toolName>
      {
        "toolName": { "regex": "mcp__chrome_devtools__.+" }
      },
      {
        "toolName": { "regex": "slack_(read|search)_.+" }
      }
    ],

    // The maximum number of automatic approvals.
    "maxApprovals": 50
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
    "slack": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.slack.com/mcp", "--header", "Authorization:Bearer FIXME"],
      "enabledTools": []
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

## File-based Prompts

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
description: Simplify complex code
import: https://raw.githubusercontent.com/anthropics/claude-plugins-official/refs/heads/main/plugins/code-simplifier/agents/code-simplifier.md
---
Additional instructions or overrides for the imported prompt.
```

Remote prompts are fetched and cached locally. The local content will be appended to the imported content.

### Locations

The agent searches for prompts in the following directories:

- `$AGENT_ROOT/.config/prompts/` (Global/User-defined prompts)
- `.agent/prompts/` (Project-specific prompts)

The prompt ID is the relative path of the file without the `.md` extension. For example, `.agent/prompts/retro.md` becomes `/prompts:retro`.

### Shortcuts

Prompts located in a `shortcuts/` subdirectory (e.g., `.agent/prompts/shortcuts/review.md`) can be invoked directly as a top-level command (e.g., `/review`). This is useful for frequently used tasks. If a prompt is in a `shortcuts/` subdirectory, its ID is simplified by removing the `shortcuts/` prefix for use as a shortcut (e.g., `shortcuts/review` becomes `/review`).

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

export AZURE_CONFIG_DIR=$HOME/.azure-agent # Change the location to store credentials
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
