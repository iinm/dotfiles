import { ToolCall } from "@langchain/core/messages/tool";

import z from "zod";

import { execCommandTool } from "./tools/execCommandTool";
import { tmuxTool } from "./tools/tmuxTool";

export function useToolCallAutoApprove({
  maxAutoApproveCount,
}: {
  maxAutoApproveCount: number;
}) {
  let autoApproveCount = 0;

  const approve = () => {
    autoApproveCount += 1;
    if (autoApproveCount <= maxAutoApproveCount) {
      return true;
    }

    autoApproveCount = 0;
    return false;
  };

  const requestApproval = () => {
    return false;
  };

  const isAutoApprovableToolCall = ({
    toolCall,
    threadId,
    workingDir: _workingDir,
  }: {
    toolCall: ToolCall;
    threadId: string;
    workingDir: string;
  }) => {
    if (toolCall.name === "tavily_search_results_json") {
      return approve();
    }
    if (toolCall.name === execCommandTool.name) {
      const args = toolCall.args as z.infer<typeof execCommandTool.schema>;
      if (
        [
          "ls",
          "wc",
          "cat",
          "head",
          "tail",
          "fd",
          "rg",
          "find",
          "grep",
          "date",
        ].includes(args.command)
      ) {
        return approve();
      }
      if (
        args.command === "sed" &&
        (args.args?.at(0) || "") === "-n" &&
        (args.args?.at(1) || "").match(/^.+p$/)
      ) {
        return approve();
      }
      if (
        args.command === "git" &&
        ["status", "diff", "log"].includes(args.args?.at(0) || "")
      ) {
        return approve();
      }
      if (
        args.command === "git" &&
        args.args?.at(0) === "branch" &&
        args.args?.at(1) === "--show-current"
      ) {
        return approve();
      }
      if (
        args.command === "mkdir" &&
        args.args?.at(0) === "-p" &&
        args.args?.at(1) === `.agent/memory`
      ) {
        return approve();
      }
    }
    if (toolCall.name === tmuxTool.name) {
      const args = toolCall.args as z.infer<typeof tmuxTool.schema>;
      if (
        ["list-sessions", "list-windows", "capture-pane"].includes(
          args.command.at(0) || "",
        )
      ) {
        return approve();
      }
      if (
        ["new-session", "new"].includes(args.command.at(0) || "") &&
        args.command.at(1) === "-d" &&
        args.command.at(2) === "-s" &&
        args.command.at(3) === `agent-${threadId}`
      ) {
        return approve();
      }
    }
    return requestApproval();
  };

  return {
    isAutoApprovableToolCall,
  };
}
