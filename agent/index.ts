import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import readline from "node:readline";
import { styleText } from "node:util";
import { v4 as uuidv4 } from "uuid";

// Setup agent
const tools = [new TavilySearchResults({ maxResults: 5 })];
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});
const memorySaver = new MemorySaver();

const agent = createReactAgent({
  llm: model,
  tools: tools,
  checkpointSaver: memorySaver,
  interruptBefore: ["tools"],
});

// Setup session
const threadId = uuidv4();

// Start CLI
const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: styleText("green", "(Ctrl-j to submit)") + "\n> ",
});

cli.prompt();

const inputBuffer: string[] = [];
cli.on("line", async (line) => {
  inputBuffer.push(line);
});

cli.on("SIGINT", () => {
  if (inputBuffer.length) {
    inputBuffer.length = 0;
    process.stdout.write(styleText("yellow", "(Input cancelled)\n"));
    cli.prompt();
  }
});

process.stdin.on("keypress", async (_, key) => {
  if (key.name === "enter") {
    const input = inputBuffer.join("\n");
    inputBuffer.length = 0;

    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    const state = await agent.getState(config);
    if (state.next.includes("tools") && input.trim() === "y") {
      // Tool calls approved
      const values: IterableReadableStream<AgentStreamValue> =
        await agent.stream(null, { ...config, streamMode: "updates" });
      await printAgentStreamValues(values);
    } else if (state.next.includes("tools")) {
      // Tool calls rejected
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
      const values: IterableReadableStream<AgentStreamValue> =
        await agent.stream(
          {
            messages: [new HumanMessage(input)],
          },
          {
            ...config,
            streamMode: "updates",
          },
        );
      await printAgentStreamValues(values);
    } else {
      const values: IterableReadableStream<AgentStreamValue> =
        await agent.stream(
          {
            messages: [new HumanMessage(input)],
          },
          {
            ...config,
            streamMode: "updates",
          },
        );
      await printAgentStreamValues(values);
    }

    const updatedState = await agent.getState(config);
    if (updatedState.next.includes("tools")) {
      const lastMessage: AIMessage =
        updatedState.values.messages[updatedState.values.messages.length - 1];
      // Auto approve tool calls
      const isEveryToolCallApproved = lastMessage.tool_calls?.every(
        (toolCall) => toolCall.name === "tavily_search_results_json",
      );
      if (isEveryToolCallApproved) {
        const values: IterableReadableStream<AgentStreamValue> =
          await agent.stream(null, {
            ...config,
            streamMode: "updates",
          });
        await printAgentStreamValues(values);
        // TODO: ここでtool呼び出しがあると止まってしまう
      } else {
        console.log(styleText("yellow", "Approve tool calls? (y/n)"));
      }
    }

    cli.prompt();
    cli.resume();
  }
});

const printAgentStreamValues = async (
  values: IterableReadableStream<AgentStreamValue>,
) => {
  for await (const value of values) {
    if ("agent" in value) {
      // show message and tool calls
      for (const message of value.agent.messages) {
        console.log(styleText("bold", "\nAgent:"));
        console.log(message.content);
        for (const toolCall of message.tool_calls) {
          console.log(styleText("bold", "\nTool call:"));
          console.log(`${toolCall.name}`);
          console.log(`${JSON.stringify(toolCall.args, null, 2)}`);
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

type AgentStreamValue =
  | {
      agent: {
        messages: {
          id: string;
          content: string;
          tool_calls: [
            {
              id: string;
              name: string;
              args: unknown;
            },
          ];
          usage_metadata: {
            output_tokens: number;
            input_tokens: number;
            total_tokens: number;
          };
        }[];
      };
    }
  | {
      tools: {
        messages: {
          id: string;
          name: string;
          content: string;
          tool_call_id: string;
        }[];
      };
    };
