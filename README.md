# dotfiles

```sh
./dotfiles setup
```

## Claude Code

```sh
cat >> ./bin.local/claude-code-print-api-key.sh << 'EOF'
#!/usr/bin/env bash

echo -n "FIXME:ANTHROPY_API_KEY"
EOF

chmod +x ./bin.local/claude-code-print-api-key.sh
```
