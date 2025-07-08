# Claude Code

## Use API Key

```sh
mkdir -p ~/.claude
cat > ~/.claude/print-api-key.sh << 'EOF'
#!/usr/bin/env bash

echo -n "FIXME:ANTHROPY_API_KEY"
EOF

chmod +x ~/.claude/print-api-key.sh
```

```sh
mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'EOF'
{
  "apiKeyHelper": "~/.claude/print-api-key.sh"
}
EOF
```

## Enable Notification

```sh
claude config set --global preferredNotifChannel terminal_bell
```
