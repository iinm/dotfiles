import readline from "node:readline";
import { styleText } from "node:util";

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import CallbackHandler from "langfuse-langchain";
import { v4 as uuidv4 } from "uuid";

import { patchFileTool } from "./tools/patchFileTool";
import { shellCommandTool } from "./tools/shellCommandTool";
import { tmuxTool } from "./tools/tmuxTool";
import { writeFileTool } from "./tools/writeFileTool";

const sessionId = uuidv4().slice(0, 8);

const PROMPT = `
You are a problem solver.

- You solve problems provided by users.
- You clarify the essence of the problem by asking questions before solving it.
- You clarify the goal of the problem solving and confirm it with the user before solving the problem.
- You break down the problem into smaller parts and confirm the plan with the user before solving it.
  Then you solve each part one by one.
- You use only provided tools to solve problems.
- You respond to users in the same language they use.

# Message Format

- You always include reasoning process in <think> tags.
- You always provide a response in <say> tags.

# Tools

## shell command

Basic commands:
- List files: fd --max-depth 2 --hidden
- List directories: fd --max-depth 2 --hidden --type d
- Show file content: cat file.txt
- Search for a string in files: rg 'string'

## tmux

tmux is used to manage daemon processes such as http servers and interactive processes
such as node.js interpreter.

Rules:
- Use the given sessionId ( agent-${sessionId} ) to run the command.
- If it's not avaiable, create a new session with the given sessionId.

Basic commands:
- Start session: new -d -s agent-${sessionId}
- Send key to session: send-keys -t agent-${sessionId}:1 'echo hello' Enter
  - You always capture-pane to get the output of the command before/after running it.
- Get output of session: capture-pane -p -t agent-${sessionId}:1 | grep -vE '^$' | tail -100
  - In this example, it removes empty lines and shows the last 100 lines.
- Create new window: new-window -t agent-${sessionId}
- List window: list-windows -t agent-${sessionId}

Usecase: Browser automation
- Start node.js interpreter: send-keys -t agent-${sessionId}:1 'node' Enter
- Send the following code to the interpreter:
  \`\`\`js
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: false })
  let page = await browser.newPage({ viewport: { width: 960, height: 540 } })
  let page.goto("http://localhost")
  let pageContent = await page.content()
  // remove script tags
  pageContent = pageContent.replace(/<script.*?<\\/script>/g, "")
  // remove style tags
  pageContent = pageContent.replace(/<style.*?<\\/style>/g, "")
  // remove comments
  pageContent = pageContent.replace(/<!--.*?-->/g, "")
  // remove html tags
  pageContent = pageContent.replace(/<.*?>/g, "")
  \`\`\`
`.trim();

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  // model: "gpt-4o",
  temperature: 0,
});

const tools = [
  shellCommandTool,
  tmuxTool,
  writeFileTool,
  patchFileTool,
  new TavilySearchResults({ maxResults: 5 }),
];

const isAutoApprovableToolCall = (toolCall: ToolCall) => {
  if (toolCall.name === "tavily_search_results_json") {
    return true;
  }
  return false;
};

const checkpointSaver = new MemorySaver();

const agent = createReactAgent({
  llm: model,
  tools: tools,
  checkpointSaver: checkpointSaver,
  interruptBefore: ["tools"],
  prompt: PROMPT,
});

const callbacks: BaseCallbackHandler[] = [];
if (process.argv.includes("--enable-langfuse")) {
  // Enable Langfuse
  const langfuseHandler = new CallbackHandler();
  callbacks.push(langfuseHandler);
}

const config = {
  configurable: {
    thread_id: sessionId,
  },
  callbacks,
};

// Start CLI
const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

cli.prompt();

cli.on("line", async (input) => {
  const state = await agent.getState(config);
  const hasPendingToolCalls = (s: typeof state) => s.next.includes("tools");

  if (hasPendingToolCalls(state)) {
    if (input.trim() === "y") {
      // Approved
      const updates: AgentUpdatesStream = await agent.stream(null, {
        ...config,
        streamMode: "updates",
      });
      await printAgentUpdatesStream(updates);
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
      const updates: AgentUpdatesStream = await agent.stream(
        {
          messages: [new HumanMessage(input)],
        },
        {
          ...config,
          streamMode: "updates",
        },
      );
      await printAgentUpdatesStream(updates);
    }
  } else {
    // No pending tool calls
    const updates: AgentUpdatesStream = await agent.stream(
      {
        messages: [new HumanMessage(input)],
      },
      {
        ...config,
        streamMode: "updates",
      },
    );
    await printAgentUpdatesStream(updates);
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
        await printAgentUpdatesStream(values);
        continue;
      } else {
        // Tool calls need approval
        console.log(styleText("yellow", "Approve tool calls? (y or feedback)"));
        break;
      }
    } else {
      // No pending tool calls
      break;
    }
  }

  cli.prompt();
  cli.resume();
});

const printAgentUpdatesStream = async (values: AgentUpdatesStream) => {
  for await (const value of values) {
    if ("agent" in value) {
      for (const message of value.agent.messages) {
        console.log(styleText("bold", "\nAgent:"));
        console.log(message.content);
        for (const toolCall of message.tool_calls || []) {
          console.log(styleText("bold", "\nTool call:"));
          console.log(`${toolCall.name}`);
          console.log(JSON.stringify(toolCall.args, null, 2));
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
      for (const message of value.tools.messages) {
        console.log(styleText("bold", "\nTool Result:"));
        console.log(`${message.name}`);

        const contentString =
          typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content, null, 2);

        const maxContentLength = 500;
        if (contentString.length > maxContentLength) {
          console.log(`${contentString.slice(0, maxContentLength)}...`);
        } else {
          console.log(contentString);
        }
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
