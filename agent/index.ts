import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { HumanMessage } from "@langchain/core/messages";
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
});

// Setup session
const threadId = uuidv4();

// Start CLI
const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
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

    const values: IterableReadableStream<AgentStreamValue> = await agent.stream(
      {
        messages: [new HumanMessage(input)],
      },
      {
        configurable: { thread_id: threadId },
      },
    );
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

    cli.prompt();
    cli.resume();
  }
});

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
