# Agent

A lightweight CLI-based coding agent that helps you with your development tasks.

## Requirements

- Node.js 22 or later
- Anthropic API key or OpenAI API key
- Tavily API key

## Setup

```sh
echo "$ANTHROPIC_API_KEY" > .secrets/anthropic-api-key.txt
echo "$OPENAI_API_KEY" > .secrets/openai-api-key.txt
echo "$TAVILY_API_KEY" > .secrets/tavily-api-key.txt
```

## Run

```sh
./bin/agent

# or
./bin/agent-<model>
```

## Development

```sh
# Install dev dependencies
npm install

# Run lint, typecheck, and test
npm run check

# Fix lint errors
npm run fix
# or
npm run fix-unsafe
```
