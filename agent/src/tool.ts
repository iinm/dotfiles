import { ToolCall } from "@langchain/core/messages/tool";

import z from "zod";

import { execCommandTool } from "./tools/execCommandTool";
import { tmuxTool } from "./tools/tmuxTool";

export function isAutoApprovableToolCall({
  toolCall,
  threadId,
}: {
  toolCall: ToolCall;
  threadId: string;
}) {
  if (toolCall.name === "tavily_search_results_json") {
    return true;
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
      return true;
    }
    if (
      args.command === "sed" &&
      (args.args?.at(0) || "") === "-n" &&
      (args.args?.at(1) || "").match(/^.+p$/)
    ) {
      return true;
    }
    if (
      args.command === "git" &&
      ["status", "diff", "log"].includes(args.args?.at(0) || "")
    ) {
      return true;
    }
  }
  if (toolCall.name === tmuxTool.name) {
    const args = toolCall.args as z.infer<typeof tmuxTool.schema>;
    if (
      ["list-sessions", "list-windows", "capture-pane"].includes(
        args.command.at(0) || "",
      )
    ) {
      return true;
    }
    if (
      ["new-session", "new"].includes(args.command.at(0) || "") &&
      args.command.at(1) === "-d" &&
      args.command.at(2) === "-s" &&
      args.command.at(3) === `agent-${threadId}`
    ) {
      return true;
    }
  }
  return false;
}
