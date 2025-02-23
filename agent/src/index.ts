import readline from "node:readline";
import { styleText } from "node:util";

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import CallbackHandler from "langfuse-langchain";
import { v4 as uuidv4 } from "uuid";

import { patchFile } from "./tools/patchFile";
import { shellCommandTool } from "./tools/shellCommandTool";
import { writeFileTool } from "./tools/writeFileTool";

// Setup agent
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const memorySaver = new MemorySaver();

const tools = [
  shellCommandTool,
  writeFileTool,
  patchFile,
  new TavilySearchResults({ maxResults: 5 }),
];

const isAutoApprovableToolCall = (toolCall: ToolCall) => {
  if (toolCall.name === "tavily_search_results_json") {
    return true;
  }
  return false;
};

const agent = createReactAgent({
  llm: model,
  tools: tools,
  checkpointSaver: memorySaver,
  interruptBefore: ["tools"],
});

// Setup Langfuse
const langfuseHandler = new CallbackHandler();
const callbacks = [langfuseHandler];

// Start CLI
const threadId = uuidv4();

const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: styleText("green", "(Ctrl-j to submit)") + "\n> ",
});

cli.prompt();

cli.on("line", async (input) => {
  const config = {
    configurable: {
      thread_id: threadId,
    },
    callbacks,
  };

  const state = await agent.getState(config);
  const hasPendingToolCalls = (s: typeof state) => s.next.includes("tools");

  if (hasPendingToolCalls(state)) {
    if (input.trim() === "y") {
      // Approved
      const agentResponse: AgentUpdatesStream = await agent.stream(null, {
        ...config,
        streamMode: "updates",
      });
      await printAgentStreamValues(agentResponse);
    } else {
      // Rejected
      const lastMessage: AIMessage =
        state.values.messages[state.values.messages.length - 1];
      const cancelMessages = lastMessage.tool_calls?.map((toolCall) => {
        return new ToolMessage({
          status: "error",
          content: "Cancelled by user.",
          tool_call_id: toolCall.id as string,
        });
      });
      await agent.updateState(config, { messages: cancelMessages });
      const agentResponse: AgentUpdatesStream = await agent.stream(
        {
          messages: [new HumanMessage(input)],
        },
        {
          ...config,
          streamMode: "updates",
        },
      );
      await printAgentStreamValues(agentResponse);
    }
  } else {
    // No pending tool calls
    const agentResponse: AgentUpdatesStream = await agent.stream(
      {
        messages: [new HumanMessage(input)],
      },
      {
        ...config,
        streamMode: "updates",
      },
    );
    await printAgentStreamValues(agentResponse);
  }

  // Auto-approve tool calls
  while (true) {
    const updatedState = await agent.getState(config);
    if (hasPendingToolCalls(updatedState)) {
      const lastMessage: AIMessage =
        updatedState.values.messages[updatedState.values.messages.length - 1];
      const isEveryToolCallApproved = lastMessage.tool_calls?.every(
        isAutoApprovableToolCall,
      );
      if (isEveryToolCallApproved) {
        console.log(styleText("green", "Tool calls auto-approved."));
        const values: AgentUpdatesStream = await agent.stream(null, {
          ...config,
          streamMode: "updates",
        });
        await printAgentStreamValues(values);
      } else {
        console.log(styleText("yellow", "Approve tool calls? (y or feedback)"));
        break;
      }
    }

    // No pending tool calls
    break;
  }

  cli.prompt();
  cli.resume();
});

const printAgentStreamValues = async (values: AgentUpdatesStream) => {
  for await (const value of values) {
    if ("agent" in value) {
      // show message and tool calls
      for (const message of value.agent.messages) {
        console.log(styleText("bold", "\nAgent:"));
        console.log(message.content);
        for (const toolCall of message.tool_calls || []) {
          console.log(styleText("bold", "\nTool call:"));
          console.log(`${toolCall.name}`);
          if (typeof toolCall.args === "object") {
            for (const arg in Object.keys(toolCall.args)) {
              console.log(`${arg}:\n${toolCall.args[arg]}`);
            }
          } else {
            console.log(toolCall.args);
          }
        }
        console.log(
          styleText(
            "gray",
            [
              "\n",
              "Usage: ",
              `total tokens: ${message.usage_metadata.total_tokens}, `,
              `input tokens: ${message.usage_metadata.input_tokens}, `,
              `ouput tokens: ${message.usage_metadata.output_tokens}`,
            ].join(""),
          ),
        );
      }
    }
    if ("tools" in value) {
      // show tool messages
      for (const message of value.tools.messages) {
        console.log(styleText("bold", "\nTool:"));
        console.log(`${message.name}`);
        console.log(`${message.content.slice(0, 100)}...`);
      }
    }
  }
};

type AgentUpdatesStream = IterableReadableStream<
  | {
      agent: {
        messages: (AIMessage & {
          usage_metadata: {
            output_tokens: number;
            input_tokens: number;
            total_tokens: number;
          };
        })[];
      };
    }
  | {
      tools: {
        messages: ToolMessage[];
      };
    }
>;
