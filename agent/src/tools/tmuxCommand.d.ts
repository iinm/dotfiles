import type { Tool } from "../tool";
import type { ExecCommandSanboxConfig } from "./execCommand";

export type TmuxCommandInput = {
  command: string;
  args?: string[];
};

export type TmuxCommandConfig = {
  sandbox?: ExecCommandSanboxConfig;
};

export function createTmuxCommandTool(config?: TmuxCommandConfig): Tool;
export const tmuxCommandTool: Tool;
