import { BaseMessageLike } from "@langchain/core/messages";

import { styleText } from "util";

import { Model } from "./model";

export function enableClaudePromptCaching({
  model,
  messages,
  cacheInterval,
}: {
  model: Model;
  messages: BaseMessageLike[];
  cacheInterval: number;
}): BaseMessageLike[] {
  if (model.model.startsWith("claude")) {
    // Example: cacheInterval = 4
    //   3 message -> -1, -5
    //   4 messages -> 3, -1
    //   7 messages -> 3, -1
    //   8 messages -> 7,  3
    const cacheTargetIndices = [
      Math.floor(messages.length / cacheInterval) * cacheInterval - 1,
      (Math.floor(messages.length / cacheInterval) - 1) * cacheInterval - 1,
    ];
    const modifiedMessages = messages.map((msg, msgIndex) => {
      if (msgIndex === 0) {
        // system message
        return msg;
      }
      if (cacheTargetIndices.includes(msgIndex)) {
        // set cache_control
        if (typeof msg === "object" && "content" in msg) {
          msg.content = Array.isArray(msg.content)
            ? msg.content.map((part, partIndex) => ({
                ...part,
                ...(partIndex === msg.content.length - 1
                  ? { cache_control: { type: "ephemeral" } }
                  : {}),
              }))
            : [
                {
                  type: "text",
                  text: msg.content,
                  cache_control: { type: "ephemeral" },
                },
              ];
          return msg;
        }
      } else {
        // clear cache_control
        if (typeof msg === "object" && "content" in msg) {
          msg.content = Array.isArray(msg.content)
            ? msg.content.map((part) => {
                if ("cache_control" in part) {
                  delete part.cache_control;
                }
                return part;
              })
            : msg.content;
          return msg;
        }
      }
      return msg;
    });

    return modifiedMessages;
  }
  return messages;
}
