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

import { execCommandTool } from "./tools/execCommandTool";
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

# Message format

You always include purpose or intent in <think> tags at the beginning of your message.

Example:
<think>Ask for clarification</think>
What is the expected output?

# Tools

Rules:
- Call one tool at a time.
- When tool output is not as expected, check the output carefully and think about the next trial.
- When you fail to call tool repeatedly, ask user for feedback.

## exec command

exec_command is used to run a one-shot command.
Use tmux to run daemon processes and interactive processes.

Rules:
- Current working directory is ${process.cwd()}.
- Use relative paths to refer to files and directories.

Basic commands:
- List files: ls ['-la']
- Find file: fd ['file.txt', '--type', 'f', '--hidden']
- List directories:
  - in current directory: fd ['--max-depth', '2', '--type', 'd', '--hidden']
  - in a specific directory: fd ['.', 'path/to/directory/', '--max-depth', '2', '--type', 'd', '--hidden']
  - --max-depth is used to limit the depth of the search.
- List files:
  - in current directory: fd ['--max-depth', '2', '--type', 'f', '--hidden']
  - in a specific directory: fd ['.', 'path/to/directory', '--max-depth', '2', '--type', 'f', '--hidden']
- Search for a string in files: rg ['regex', './']
  - Directory or file must be specified.
- Show file content: cat ['file.txt']
  - Output is truncated if the file is too large.
  - Use rg to get outline or part of a large file.
- Get outline of a file:
  - markdown: rg ['^#+', 'file.md']
  - typescript: rg ['^(export|const|function|class|interface|type|enum)', 'file.ts']
- Get part of a file: rg ['regex', 'file.txt', '-B', '5', '-A', '5']
  - It shows 5 lines (b)efore and (a)fter the matched line.

## shell command

shell_command is used to run a shell command that cotains pipes and redirections.
Use exec_command when you don't need pipes and redirections.

Example:
- Write command output to a file: "echo 'hello' > file.txt"

## tmux

tmux is used to manage daemon processes such as http servers and interactive processes such as node.js interpreter.
Use exec_command to run one-shot commands.

Rules:
- Use the given sessionId ( agent-${sessionId} ) to run the command.
- If it's not avaiable, create a new session with the given sessionId.
- Current working directory is ${process.cwd()}.
- Use relative paths to refer to files and directories.

Basic commands:
- Start session: new-session ['-d', '-s', 'agent-${sessionId}']
- Send key to session:
  send-keys ['-t', 'agent-${sessionId}:1', 'echo hello', 'Enter']
  # Delete line
  send-keys ['-t', 'agent-${sessionId}:1', 'C-a', 'C-k']
- Get output of session:
  capture-pane ['-p', '-t', 'agent-${sessionId}:1']
- List window: list-windows ['-t', 'agent-${sessionId}']
- Create new window: new-window ['-t', 'agent-${sessionId}']

Usecase: Browser automation
- Change directory to the directory where you have playwright installed.
  send-keys ['-t', 'agent-${sessionId}:1', 'cd ${__dirname}', 'Enter']
- Start node.js interpreter.
  send-keys ['-t', 'agent-${sessionId}:1', 'node', 'Enter']
  capture-pane -p -t agent-${sessionId}:1
- Send the following code to the interpreter: (It should be send one by one, check the output after each command)
  send-keys ['-t', 'agent-${sessionId}:1', 'const { chromium } = require("playwright")', 'Enter']
  send-keys ['-t', 'agent-${sessionId}:1', 'const browser = await chromium.launch({ headless: false })', 'Enter']
  send-keys ['-t', 'agent-${sessionId}:1', 'let page = await browser.newPage({ viewport: { width: 1280, height: 960 } })', 'Enter']
  send-keys ['-t', 'agent-${sessionId}:1', 'let page.goto("http://example.com")', 'Enter']
`.trim();

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  // model: "gpt-4o",
  temperature: 0,
});

const tavilySearchResultsTool = new TavilySearchResults({ maxResults: 5 });
const tools = [
  execCommandTool,
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
  if (toolCall.name === execCommandTool.name) {
    const args = toolCall.args as z.infer<typeof execCommandTool.schema>;
    if (
      ["cat", "ls", "fd", "rg", "wc", "head", "tail"].includes(args.command)
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
  prompt: styleText("gray", `(Session ID: ${sessionId})`) + "\n> ",
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

        const maxContentLength = 1000;
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
