import fs from "node:fs";
import readline from "node:readline";

import {
  BaseMessage,
  BaseMessageLike,
  HumanMessage,
  SystemMessage,
  isAIMessage,
  isToolMessage,
} from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { Command, Interrupt } from "@langchain/langgraph";

import { styleText } from "util";
import z from "zod";

import { Agent } from "./agent";
import { Model } from "./model";
import { isAutoApprovableToolCall } from "./tool";
import {
  execCommandTool,
  execCommandToolArgsUserPrinter,
  execCommandToolOutputUserPrinter,
} from "./tools/execCommandTool";
import {
  patchFileTool,
  patchFileToolArgsUserPrinter,
} from "./tools/patchFileTool";
import {
  tmuxTool,
  tmuxToolArgsUserPrinter,
  tmuxToolOutputUserPrinter,
} from "./tools/tmuxTool";
import {
  writeFileTool,
  writeFileToolArgsUserPrinter,
} from "./tools/writeFileTool";

export async function startCLI({
  model,
  agent,
  threadId,
  prompt,
}: {
  model: Model;
  agent: Agent;
  threadId: string;
  prompt: string;
}) {
  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  const initialMessages: BaseMessageLike[] = [
    new SystemMessage({
      content: [
        {
          type: "text",
          text: prompt,
        },
      ],
    }),
  ];

  // state
  let isInitialMessagesSent = false;
  let interruptedToolCall: ToolCall | undefined;
  const alreadyHandledMessageIds = new Set<string>();

  const onUserInput = async (input: string) => {
    const messages: BaseMessageLike[] = [];
    let command: Command | undefined;

    if (!isInitialMessagesSent) {
      isInitialMessagesSent = true;
      messages.push(...initialMessages);
    }

    if (interruptedToolCall) {
      interruptedToolCall = undefined;
      if (/^(y|yes)$/.test(input.trim())) {
        command = new Command({
          resume: {
            action: "continue",
          },
        });
      } else {
        command = new Command({
          resume: {
            action: "feedback",
            data: input,
          },
        });
      }
    } else {
      messages.push(new HumanMessage(input));
    }

    const agentStream = await agent.stream(command || messages, {
      ...config,
      streamMode: "updates",
    });
    await onAgentStream({
      agentStream,
      onInterruptToolCall: (toolCall) => {
        interruptedToolCall = toolCall;
      },
      alreadyHandledMessageIds,
    });

    while (true) {
      if (interruptedToolCall) {
        if (
          isAutoApprovableToolCall({ toolCall: interruptedToolCall, threadId })
        ) {
          console.log(styleText("green", "\nTool call auto-approved."));
          interruptedToolCall = undefined;
          const continuedStream = await agent.stream(
            new Command({
              resume: {
                action: "continue",
              },
            }),
            {
              ...config,
              streamMode: "updates",
            },
          );
          await onAgentStream({
            agentStream: continuedStream,
            onInterruptToolCall: (toolCall) => {
              interruptedToolCall = toolCall;
            },
            alreadyHandledMessageIds,
          });
          continue;
        } else {
          console.log(
            styleText("yellow", "\nApprove tool calls? (y or feedback)"),
          );
          break;
        }
      } else {
        // No interrupted tool call
        break;
      }
    }
  };

  // Start CLI
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt:
      styleText(
        ["white", "bgGray"],
        `\nThread: ${threadId}, Model: ${model.model}, Commands: "resume work", "save memory", "bye"`,
      ) + "\n> ",
  });

  cli.on("line", async (input) => {
    await onUserInput(input);
    cli.prompt();
    cli.resume();
  });

  if (process.argv.length > 2) {
    console.log(`Reading file: ${process.argv[2]}`);
    const input = fs.readFileSync(process.argv[2], "utf8");
    await onUserInput(input);
  }
  cli.prompt();
}

async function onAgentStream({
  agentStream,
  onInterruptToolCall,
  alreadyHandledMessageIds,
}: {
  agentStream: IterableReadableStream<{
    [key: string]: BaseMessage | Interrupt[];
  }>;
  onInterruptToolCall: (toolCall: ToolCall) => void;
  alreadyHandledMessageIds: Set<string>;
}) {
  for await (const step of agentStream) {
    for (const [taskName, update] of Object.entries<BaseMessage | Interrupt[]>(
      step,
    )) {
      if (update instanceof BaseMessage && update.id) {
        if (alreadyHandledMessageIds.has(update.id)) {
          continue;
        } else {
          alreadyHandledMessageIds.add(update.id);
        }
      }
      if (["callModel", "callTool"].includes(taskName)) {
        const message = update as BaseMessage;
        printMessage(message);
      } else if (taskName === "__interrupt__") {
        const interrupts = update as Interrupt[];
        if (interrupts.at(0)?.value.tool_call) {
          const toolCall: ToolCall = interrupts.at(0)?.value.tool_call;
          printToolCall(toolCall);
          onInterruptToolCall(toolCall);
        } else {
          console.log(styleText("red", `\nUnknown interrupt: ${update}`));
        }
        continue;
      } else if (taskName === "agent") {
        continue;
      } else if (taskName === "__metadata__") {
        // console.log(
        //   styleText("gray", `\nMetadata: ${JSON.stringify(update, null, 2)}`),
        // );
        continue;
      } else {
        console.log(styleText("red", `\nUnknown task: ${taskName}\n${update}`));
      }
    }
  }
}

async function printMessage(message: BaseMessage) {
  // console.log(styleText("bold", "\nRaw Message:"));
  // console.log(message);

  if (isAIMessage(message)) {
    console.log(styleText("bold", "\nAgent:"));

    if (typeof message.content === "string") {
      // OpenAI
      console.log(message.content);
    } else if (Array.isArray(message.content)) {
      // Claude
      for (const part of message.content) {
        if ("thinking" in part && typeof part["thinking"] === "string") {
          console.log(
            [
              styleText("blue", "<thinking>"),
              part["thinking"],
              styleText("blue", "</thinking>"),
            ].join("\n"),
          );
        } else if ("text" in part && typeof part["text"] === "string") {
          console.log(part["text"]);
        } else if (part.type === "tool_use") {
          // no-op
        } else {
          // unknown message type
          console.log(JSON.stringify(part, null, 2));
        }
      }
    } else {
      // unknown message format
      console.log(JSON.stringify(message, null, 2));
    }

    const usageMetadata: string[] = [];
    const usageMetadataRaw = message.usage_metadata;
    if (typeof usageMetadataRaw === "object") {
      for (const [prop, value] of Object.entries(usageMetadataRaw)) {
        if (typeof value === "number") {
          usageMetadata.push(`${prop}: ${value.toLocaleString()}`);
        }
      }
    }
    console.log(styleText("gray", `\n${usageMetadata.join(", ")}`));

    const usageMetadateInputTokenDetails: string[] = [];
    if (usageMetadataRaw?.input_token_details) {
      for (const [prop, value] of Object.entries(
        usageMetadataRaw.input_token_details,
      )) {
        if (typeof value === "number") {
          usageMetadateInputTokenDetails.push(
            `${prop}: ${value.toLocaleString()}`,
          );
        }
      }
    }

    const usageMetadateOutputTokenDetails: string[] = [];
    if (usageMetadataRaw?.output_token_details) {
      for (const [prop, value] of Object.entries(
        usageMetadataRaw.output_token_details,
      )) {
        if (typeof value === "number") {
          usageMetadateOutputTokenDetails.push(
            `${prop}: ${value.toLocaleString()}`,
          );
        }
      }
    }

    if (
      usageMetadateInputTokenDetails.length ||
      usageMetadateOutputTokenDetails.length
    ) {
      console.log(
        styleText(
          "gray",
          `(input) ${usageMetadateInputTokenDetails.join(", ")} / (output) ${usageMetadateOutputTokenDetails.join(", ")}`,
        ),
      );
    }
  } else if (isToolMessage(message)) {
    console.log(styleText("bold", "\nTool Result:"));
    const toolOutput =
      typeof message.content === "string"
        ? message.content
        : message.content.length && "text" in message.content[0]
          ? message.content[0].text
          : "";
    if (message.name === execCommandTool.name) {
      const formattedOutput = execCommandToolOutputUserPrinter(toolOutput);
      console.log(`\n${formattedOutput}`);
    } else if (message.name === tmuxTool.name) {
      const formattedOutput = tmuxToolOutputUserPrinter(toolOutput);
      console.log(`\n${formattedOutput}`);
    } else {
      const contentString =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content, null, 2);

      const maxContentLength = 1024;
      if (contentString.length > maxContentLength) {
        console.log(`\n${contentString.slice(0, maxContentLength)}...`);
      } else {
        console.log(`\n${contentString}`);
      }
    }
  } else {
    console.log(styleText("bold", "\nUnknown message type:"));
    console.log(JSON.stringify(message, null, 2));
  }
}

function printToolCall(toolCall: ToolCall) {
  console.log(styleText("bold", "\nTool call:"));
  console.log(`${toolCall.name}`);
  if (toolCall.name === execCommandTool.name) {
    console.log(
      execCommandToolArgsUserPrinter(
        toolCall.args as z.infer<typeof execCommandTool.schema>,
      ),
    );
  } else if (toolCall.name === tmuxTool.name) {
    console.log(
      tmuxToolArgsUserPrinter(toolCall.args as z.infer<typeof tmuxTool.schema>),
    );
  } else if (toolCall.name === writeFileTool.name) {
    console.log(
      writeFileToolArgsUserPrinter(
        toolCall.args as z.infer<typeof writeFileTool.schema>,
      ),
    );
  } else if (toolCall.name === patchFileTool.name) {
    console.log(
      patchFileToolArgsUserPrinter(
        toolCall.args as z.infer<typeof patchFileTool.schema>,
      ),
    );
  } else {
    console.log(JSON.stringify(toolCall.args, null, 2));
  }
}
