import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { tool } from "@langchain/core/tools";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import CallbackHandler from "langfuse-langchain";
import { exec } from "node:child_process";
import fs from "node:fs";
import readline from "node:readline";
import { styleText } from "node:util";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

// Tools
const isAutoApprovableToolCall = (toolCall: ToolCall) => {
  if (toolCall.name === "tavily_search_results_json") {
    return true;
  }
  return false;
};

const shellCommandTool = tool(
  async (input) => {
    const { command } = input;
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }
        resolve(
          [
            "<stdout>",
            stdout,
            "</stdout>",
            "<stderr>",
            stderr,
            "</stderr>",
          ].join("\n"),
        );
      });
    });
  },
  {
    name: "shell_command",
    description: "Run a shell command.",
    schema: z.object({
      command: z.string().describe("The shell command to run."),
    }),
  },
);

const writeFileTool = tool(
  async (input) => {
    const { path, content } = input;
    return new Promise((resolve, reject) => {
      fs.writeFile(path, content, (error) => {
        if (error) {
          reject(error);
        }
        resolve(`Wrote to file: ${path}`);
      });
    });
  },
  {
    name: "write_to_file",
    description: "Write to a file.",
    schema: z.object({
      path: z.string().describe("The file path."),
      content: z.string().describe("The content of the file."),
    }),
  },
);

const patchFile = tool(
  async (_input) => {
    return new Promise((_resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  },
  {
    name: "patch_file",
    description: "Patch a file.",
    schema: z.object({
      path: z.string().describe("The file path."),
      diff: z.string().describe(`
The diff to apply to the file.

Format:
<<<<<<< SEARCH
(content to be removed)
=======
(new content to replace the removed content)
>>>>>>> REPLACE

<<<<<<< SEARCH
(second content to be removed)
=======
(new content to replace the second removed content)
>>>>>>> REPLACE

...
`),
    }),
  },
);

// Setup agent
const tools = [
  shellCommandTool,
  writeFileTool,
  patchFile,
  new TavilySearchResults({ maxResults: 5 }),
];

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

const inputBuffer: string[] = [];
cli.on("line", async (line) => {
  inputBuffer.push(line);
});

cli.on("SIGINT", () => {
  if (inputBuffer.length) {
    inputBuffer.length = 0;
    process.stdout.write(styleText("yellow", "(Input cancelled)\n"));
    cli.prompt();
  } else {
    // Exit
    cli.close();
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
          console.log(
            styleText("yellow", "Approve tool calls? (y or feedback)"),
          );
          break;
        }
      }

      // No pending tool calls
      break;
    }

    cli.prompt();
    cli.resume();
  }
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
          for (const arg in Object.keys(toolCall.args)) {
            console.log(`${arg}:\n${toolCall.args[arg]}`);
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
