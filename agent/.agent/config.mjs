const sandbox = {
  command: ".agent/sandbox/run",
  args: ["--skip-build"],
};

export default {
  permissions: {
    allow: [
      {
        toolName: "exec_command",
        input: { command: "npm", args: ["run", /^(check|fix)$/] },
      },
      {
        toolName: "patch_file",
        input: { fileName: /^src\// },
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
              "registry.npmjs.org",
              toolUse.input.command,
              ...toolUse.input.args,
            ],
          },
        }),
      },
      {
        pattern: {
          toolName: "exec_command",
        },
        rewrite: (toolUse) => ({
          toolName: "exec_command",
          input: {
            command: sandbox.command,
            args: [
              ...sandbox.args,
              toolUse.input.command,
              ...(toolUse.input.args || []),
            ],
          },
        }),
      },
    ],
  },

  mcpServers: {},
};
