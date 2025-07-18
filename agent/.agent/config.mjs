const sandbox = {
  command: "docker-sandbox",
  args: [
    "--dockerfile",
    ".agent/sandbox/Dockerfile",
    "--use-volume",
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
              "--allow-write",
              "--allow-net registry.npmjs.org",
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
