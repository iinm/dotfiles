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
import { z } from "zod";

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
- You respond to users in the same language they use.

# Tools

Rules:
- Call tools one by one. Do not call multiple tools at once.

## shell command

Rules:
- Current working directory is ${process.cwd()}.
- Use relative paths to refer to files and directories.

Basic commands:
- Find file: fd file.txt --type f --hidden
- List directories:
  \`\`\`
  fd --max-depth 2 --type d --hidden
  fd . 'path/to/directory/' --max-depth 2 --type d --hidden
  \`\`\`
- List files:
  \`\`\`
  fd --max-depth 2 --type f --hidden
  fd . '/path/to/directory' --max-depth 2 --type f --hidden
  \`\`\`
- Show file content: cat file.txt
- Search for a string in files: rg 'string'

## tmux

tmux is used to manage daemon processes such as http servers and interactive processes
such as node.js interpreter.

Rules:
- Use the given sessionId ( agent-${sessionId} ) to run the command.
- If it's not avaiable, create a new session with the given sessionId.
- Current working directory is ${process.cwd()}.
- Use relative paths to refer to files and directories.

Basic commands:
- Start session: new-session -d -s agent-${sessionId}
- Send key to session:
  \`\`\`
  send-keys -t agent-${sessionId}:1 'echo hello' Enter
  # Note that last ';' should be escaped.
  send-keys -t agent-${sessionId}:1 'echo hello\\;' Enter
  # Delete line
  send-keys -t agent-${sessionId}:1 C-a C-k
  \`\`\`
- Get output of session:
  \`\`\`
  capture-pane -p -t agent-${sessionId}:1 | grep -vE '^$' | tail -10
  \`\`\`
  - In this example, it removes empty lines and shows the last 10 lines.
  - You can change the number of lines to show.
- List window: list-windows -t agent-${sessionId}
- Create new window: new-window -t agent-${sessionId}

Usecase: Browser automation
- Change directory to the directory where you have playwright installed.
  \`\`\`
  send-keys -t agent-${sessionId}:1 'cd ${__dirname}' Enter
  \`\`\`
- Start node.js interpreter.
  \`\`\`
  send-keys -t agent-${sessionId}:1 'node' Enter
  capture-pane -p -t agent-${sessionId}:1 | grep -vE '^$' | tail -10
  \`\`\`
- Send the following code to the interpreter: (It should be send one by one, check the output after each command)
  \`\`\`
  send-keys -t agent-${sessionId}:1 'const { chromium } = require("playwright")' Enter
  send-keys -t agent-${sessionId}:1 'const browser = await chromium.launch({ headless: false })' Enter
  send-keys -t agent-${sessionId}:1 'let page = await browser.newPage({ viewport: { width: 1280, height: 960 } })' Enter
  send-keys -t agent-${sessionId}:1 'let page.goto("http://example.com")' Enter
  \`\`\`
`.trim();

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  // model: "gpt-4o",
  temperature: 0,
});

const tavilySearchResultsTool = new TavilySearchResults({ maxResults: 5 });
const tools = [
  shellCommandTool,
  tmuxTool,
  writeFileTool,
  patchFileTool,
  tavilySearchResultsTool,
];

const isAutoApprovableToolCall = (toolCall: ToolCall) => {
  if (toolCall.name === tavilySearchResultsTool.name) {
    return true;
  }
  if (toolCall.name === shellCommandTool.name) {
    const args = toolCall.args as z.infer<typeof shellCommandTool.schema>;
    if (args.command.startsWith("fd ")) {
      return true;
    }
    if (args.command.startsWith("rg ")) {
      return true;
    }
    if (args.command.startsWith("cat ")) {
      return true;
    }
  }
  if (toolCall.name === tmuxTool.name) {
    const args = toolCall.args as z.infer<typeof tmuxTool.schema>;
    if (args.command.startsWith("capture-pane ")) {
      return true;
    }
    if (args.command.startsWith("list-windows ")) {
      return true;
    }
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
if (process.env.LANGFUSE_BASEURL) {
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
          if (toolCall.name === writeFileTool.name) {
            const typedArgs = toolCall.args as z.infer<
              typeof writeFileTool.schema
            >;
            console.log(`path: ${typedArgs.path}`);
            console.log(`content:\n${typedArgs.content}`);
          } else if (toolCall.name === patchFileTool.name) {
            const typedArgs = toolCall.args as z.infer<
              typeof patchFileTool.schema
            >;
            console.log(`path: ${typedArgs.path}`);
            console.log(`diff:\n${typedArgs.diff}`);
          } else {
            console.log(JSON.stringify(toolCall.args, null, 2));
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
