# Claude Code

## Use API Key

```sh
mkdir -p ~/.secrets
cat > ~/.secrets/claude-code-print-api-key.sh << 'EOF'
#!/usr/bin/env bash

echo -n "FIXME:ANTHROPY_API_KEY"
EOF

chmod +x ~/.secrets/claude-code-print-api-key.sh
```

```sh
mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'EOF'
{
  "apiKeyHelper": "~/.secrets/claude-code-print-api-key.sh"
}
EOF
```

## Enable Notification

```sh
claude config set --global preferredNotifChannel terminal_bell
```
