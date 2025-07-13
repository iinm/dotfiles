const sandbox = {
  command: "docker-sandbox",
  args: [
    "--dockerfile",
    ".agent/Dockerfile.sandbox",
    "--volume",
    "node_modules",
    "--no-tty",
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
