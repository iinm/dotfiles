export type ExecCommandInput = {
  command: string;
  args?: string[];
};

export type ExecCommandConfig = {
  sandbox?: ExecCommandSanboxConfig;
};

export type ExecCommandSanboxConfig = {
  command: string;
  args?: string[];
  rules?: {
    pattern: {
      command: string;
      args?: string[];
    };
    mode: "sandbox" | "unsandboxed";
    additionalArgs?: string[];
  }[];
};
