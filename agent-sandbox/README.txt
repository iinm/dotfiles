agent-sandbox v0.0.14 - Run a command in a sandboxed Docker environment

Usage: agent-sandbox [--dockerfile FILE]
           [--platform PLATFORM]
           [--env-file FILE]
           [--allow-write] [--allow-net [DESTINATIONS|--]]
           [--volume [NAME:]CONTAINER_DIR]
           [--mount-writable HOST_DIR:CONTAINER_DIR] [--mount-readonly HOST_DIR:CONTAINER_DIR]
           [--publish [HOST_ADDRESS:]HOST_PORT:CONTAINER_PORT]
           [--tty]
           [--no-cache]
           [--verbose] [--dry-run]
           COMMAND


Options:

  --dockerfile FILE         Path to a Dockerfile. If not set, a preset Dockerfile and network policy is used.
                            The container must include busybox, bash, iptables, ipset, dnsmasq, and dig commands.
  --env-file FILE           Path to a .env file to load environment variables from.
  --platform                Specify the platform for image building and container execution
                            (e.g., linux/arm64 or linux/amd64).
  --allow-write             Allow write access to the project root inside the container.
                            By default, the project root (git root or current directory) is read-only.
  --allow-net DESTINATIONS  Allow connections to specified domains or IP addresses.
                            Separate multiple destinations with commas.
                            If no port is given, only HTTPS (443) is allowed.
  --volume [NAME:]CONTAINER_DIR
                            Mount a writable Docker volume to a container path.
                            If NAME is not given, the volume name is generated.
  --mount-readonly HOST_DIR:CONTAINER_DIR
                            Mount a host file or directory to a container path as read-only.
  --mount-writable HOST_DIR:CONTAINER_DIR
                            Mount a host file or directory to a container path as writable.
  --publish [HOST_ADDRESS:]HOST_PORT:CONTAINER_PORT
                            Publish container port(s) to the host.
                            If no host address is given, ports bind to 127.0.0.1 by default.
  --tty                     Allocate a pseudo-TTY for the container.
  --no-cache                Don't use cache when building the image.
  --verbose                 Output verbose logs to stderr.
  --dry-run                 Don't execute the command; just print it to stdout.


Examples:

  Start shell with preset configuration:
    agent-sandbox --tty --verbose zsh

  Check preset configuration:
    agent-sandbox --tty --verbose --dry-run zsh

  Start Claude Code:
    agent-sandbox --allow-write --allow-net --mount-writable \
      ~/.claude:/home/sandbox/.claude,~/.claude.json:/home/sandbox/.claude.json \
      --tty --verbose zsh -ic claude

  Start Codex CLI:
    agent-sandbox --env-file .env.sandbox --allow-write --allow-net \
      --mount-writable ~/.codex:/home/sandbox/.codex \
      --tty --verbose zsh -ic codex

  Start Gemini CLI:
    agent-sandbox --env-file .env.sandbox --allow-write --allow-net \
      --mount-writable ~/.gemini:/home/sandbox/.gemini \
      --tty --verbose zsh -ic gemini

  Install tools with mise:
    agent-sandbox --allow-net nodejs.org --verbose zsh -ic "mise install node"
    agent-sandbox --allow-net github.com,dl.google.com zsh -ic "mise install go"

  Run with Dockerfile:
    agent-sandbox --dockerfile Dockerfile.minimum --tty --verbose bash

  Allow access to docker host:
    agent-sandbox --dockerfile Dockerfile.minimum \
      --allow-net host.docker.internal:3000 \
      --verbose busybox nc host.docker.internal 3000 < /dev/null


Preset Configuration:

  When --dockerfile is not specified, a preset Debian 12 image is used with:
  - System packages: busybox, bash, zsh (with grml config), ripgrep, fd, dig, curl, git
  - Node.js v22.17.1 with npm
  - mise-en-place package manager for additional runtime installations
  - AI coding assistants: Claude Code, Gemini CLI, Codex CLI
  - Persistent storage for shell history, git config, and AI tool configurations
  - Default editor: busybox vi
  - Pre-allowed network access for mise and coding agents
    (mise-versions.jdx.dev, api.anthropic.com, generativelanguage.googleapis.com, etc.)


How to view DNS query log:

  DNS queries are logged by dnsmasq and can only be viewed through Docker logs.
  
  Find the container name:
  docker ps | grep agent-sandbox
  
  View DNS query logs in real-time
  docker logs -f <container-name>
