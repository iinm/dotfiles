const sandbox = {
  command: "agent-docker-sandbox",
  args: [
    "--silent",
    "--dockerfile",
    ".agent/Dockerfile.sandbox",
    "--no-tty",
    "--volume",
    "node_modules",
  ],
};

export default {
  permissions: {
    allow: [
      {
        toolName: "exec_command",
        input: { command: "npm", args: ["run", /(check|fix)/] },
      },
    ],

    rewrite: [
      {
        pattern: {
          toolName: "exec_command",
          input: { command: "npm", args: ["install"] },
        },
        rewrite: (toolUse) => ({
          toolName: "exec_command",
          input: {
            command: sandbox.command,
            args: [
              ...sandbox.args,
              "--allow-net",
              "--allow-write",
              "--",
              toolUse.input.command,
              ...toolUse.input.args,
            ],
          },
        }),
      },
      {
        pattern: {
          toolName: "exec_command",
          input: { command: "npm", args: ["run"] },
        },
        rewrite: (toolUse) => ({
          toolName: "exec_command",
          input: {
            command: sandbox.command,
            args: [
              ...sandbox.args,
              "--",
              toolUse.input.command,
              ...toolUse.input.args,
            ],
          },
        }),
      },
    ],
  },

  mcpServers: {},
};
