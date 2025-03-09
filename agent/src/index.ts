import fs from "node:fs";
import readline from "node:readline";
import { styleText } from "node:util";

import { ChatAnthropic } from "@langchain/anthropic";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  InputTokenDetails,
  OutputTokenDetails,
  SystemMessage,
  ToolMessage,
  UsageMetadata,
} from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import CallbackHandler from "langfuse-langchain";
import { z } from "zod";

import {
  execCommandTool,
  execCommandToolArgsUserPrinter,
  execCommandToolOutputUserPrinter,
} from "./tools/execCommandTool";
import {
  patchFileTool,
  patchFileToolArgsUserPrinter,
} from "./tools/patchFileTool";
import { readWebPageByBrowserTool } from "./tools/readWebPageByUserBrowserTool";
import { readWebPageTool } from "./tools/readWebPageTool";
import {
  tmuxTool,
  tmuxToolArgsUserPrinter,
  tmuxToolOutputUserPrinter,
} from "./tools/tmuxTool";
import {
  writeFileTool,
  writeFileToolArgsUserPrinter,
} from "./tools/writeFileTool";

const startTime = new Date();

// yyyy-mm-dd-hhmm
const sessionId =
  startTime.toISOString().slice(0, 10) +
  "-" +
  ("0" + startTime.getHours()).slice(-2) +
  ("0" + startTime.getMinutes()).slice(-2);

const PROMPT = `
You are a problem solver.

- Solve problems provided by users.
- Clarify the essence of the problem by asking questions before proceeding.
- Clarify the goal of problem solving and confirm it with the user before proceeding.
- Divide the task into smaller parts, confirm the plan with the user, and then solve each part one by one.

# User Interactions

- Respond to users in the same language they use.
- Users specify file paths relative to the current working directory.
  - Crrent working directory: ${process.cwd()}
- When user ends the conversation by saying "bye", "exit", or "quit", do the following steps one by one:
  - Kill the tmux session named agent-${sessionId} if it is running.
  - Save the memory bank.

# Tools

Rules:
- Call one tool at a time.
- When a tool's output is not as expected, review it carefully and consider your next steps.
- If repeated attempts to call a tool fail, ask the user for feedback.

## exec command

exec_command is used to run a one-shot command.
Use tmux to run daemon processes and interactive processes.

- Current working directory is ${process.cwd()}.
- Use relative paths to refer to files and directories.
- Do not read a file content at once. Use head, tail, sed, rg to read a required part of the file.

File and directory command examples:
- List files: ls ['-alh', 'path/to/directory']
- Find files: fd ['<regex>', 'path/to/directory']
  - Options:
    - --type <type>: f for file, d for directory
    - --max-depth <N>
    - --hidden: include hidden files
    - --no-ignore: include ignored files by .gitignore
  - List directories to get project structure: fd ['.', 'path/to/directory/', '--max-depth', '3', '--type', 'd', '--hidden']
    '.' means "match all"
- Search for a string in files: rg ['-n', '<regex>', './']
  - Directory or file must be specified.
  - Note that special characters like $, ^, *, [, ], (, ), etc. in regex must be escaped with a backslash.
  - Options:
    - -n: Show line number
    - -i: Ignore case.
    - -w: Match whole words.
    - -g: Glob pattern. e.g. '*.js', '!*.test.ts'
    - -A <N>: Show lines after the match.
    - -B <N>: Show lines before the match.
    - --hidden: include hidden files
    - --no-ignore: include ignored files by .gitignore
- Extract the outline of a file, including line numbers for headings, function definitions, etc.: rg ['-n', '<patterns according to file type>', 'file.txt']
  - markdown: rg ['-n', '^#+', 'file.md']
  - typescript: rg ['-n', '^(export|const|function|class|interface|type|enum)', 'file.ts']
- Read lines from a file:
  - Use rg to either extract the outline or get the line numbers of lines containing a specific pattern.
  - Get the specific lines: sed ['-n', '<start>,<end>p', 'file.txt']
    - It is recommended to read 300 lines at a time.
    - 1st to 300th lines: sed ['-n', '1,300p', 'file.txt']
    - 301st to 600th lines: sed ['-n', '301,600p', 'file.txt']
    - Read more lines if needed.

Other command examples:
- Get current date time: date ['+%Y-%m-%d %H:%M:%S']
- Show git status (branch, modified files, etc.): git ['status']

## write file

write_file is used to write content to a file.

When using write_file:
- Be careful not to overwrite files that are unrelated to the requested changes.
- Verify the file path before writing to ensure you're modifying the correct file.

## patch file

patch_file is used to modify a file by replacing specific content with new content.

Format:
\`\`\`
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
\`\`\`

- <<<<<<< SEARCH (7 < characters + SEARCH) is the start of the search content.
- ======= (7 = characters) is the separator between the search and replace content.
- >>>>>>> REPLACE (7 > characters + REPLACE) is the end of the replace content.

Rules:
- Read the file content before patching it.
- Content is searched as an exact match including indentation and line breaks.
- The first match found will be replaced if there are multiple matches.
- Use multiple SEARCH/REPLACE blocks to replace multiple contents.

## tmux

tmux is used to manage daemon processes such as http servers and interactive processes such as node.js interpreter.
Use exec_command to run one-shot commands.

Rules:
- Use the given sessionId ( agent-${sessionId} ) to run the command.
- If it's not available, create a new session with the given sessionId.
- Current working directory is ${process.cwd()}.
- Use relative paths to refer to files and directories.

Basic commands:
- Start session: new-session ['-d', '-s', 'agent-${sessionId}']
- Detect window number to send keys: list-windows ['-t', 'agent-${sessionId}']
- Get output of window before sending keys: capture-pane ['-p', '-t', 'agent-${sessionId}:<window>']
- Send key to session: send-keys ['-t', 'agent-${sessionId}:<window>, 'echo hello', 'Enter']
- Delete line: send-keys ['-t', 'agent-${sessionId}:<window>, 'C-a', 'C-k']

Usecase: Browser automation (Experimental)
- Change directory to the directory where you have playwright installed.
  send-keys ['-t', 'agent-${sessionId}:<window>, 'cd ${__dirname}', 'Enter']
- Start node.js interpreter.
  send-keys ['-t', 'agent-${sessionId}:<window>, 'node', 'Enter']
- Open specified URL in the browser.
  send-keys ['-t', 'agent-${sessionId}:<window>, 'const { chromium } = require("playwright")', 'Enter']
  send-keys ['-t', 'agent-${sessionId}:<window>, 'const browser = await chromium.launch({ headless: false })', 'Enter']
  send-keys ['-t', 'agent-${sessionId}:<window>, 'let page = await browser.newPage({ viewport: { width: 1280, height: 960 } })', 'Enter']
  send-keys ['-t', 'agent-${sessionId}:<window>, 'let page.goto("http://example.com")', 'Enter']

## read web page

read_web_page is used to read the content of a given web page URL.
Do not use this tool for local files. Use exec_command/sed for local files.

## read web page by browser

read_web_page_by_browser is used to read the content of a given web page URL using a browser.

Usecase:
- Fetching content from websites that require JavaScript execution.
- Fetching content from websites requiring login.

# Memory Bank

Save the important information in the memory bank to resume the work later.
The content should include all the necessary information to resume the work even if you forget the details.

Usecase:
- User requests to save the memory bank by saying "save memory bank", "save memory".
- User asks you to resume the work by saying "resume work".
  - Show the memory files and ask user to choose the memory file to resume the work.

Path: ${process.cwd()}/.agent/memory/${sessionId}--<snake-case-title>.md
- Create a concise and clear title that represents the content.
- Ensure that the directories exists, creating them if necessary.

Memory Bank Format:
\`\`\`markdown
# <title>

## (Why/What) Task Description

<placeholder>
Purpose of the task, what you are trying to achieve, what you are trying to solve, etc.
</placeholder>

## (How) Plan

<placeholder>
Steps to achieve the task, how you are going to solve the problem, etc.
</placeholder>

## Current Status

<placeholder>
What you have done so far, what is the current status, what is pending, etc.
</placeholder>

## Conclusion

<placeholder>
Describe the final full output you made.
</placeholder>

## Notes for Future

<placeholder>
What you have learned, what you have tried, what you have found, etc.
</placeholder>

## System Information

- Current working directory:
- git branch:
\`\`\`
`.trim();

const isAutoApprovableToolCall = (toolCall: ToolCall) => {
  if (toolCall.name === tavilySearchResultsTool.name) {
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
      args.command.at(3) === `agent-${sessionId}`
    ) {
      return true;
    }
  }
  return false;
};

const createModel = () => {
  const modelName = process.env.MODEL || "gpt-4o-mini";
  switch (modelName) {
    case "gpt-4o-mini":
      return {
        model: new ChatOpenAI({
          model: "gpt-4o-mini",
          temperature: 0,
        }),
        modelName,
      };
    case "o3-mini-medium":
      return {
        model: new ChatOpenAI({
          model: "o3-mini",
          reasoningEffort: "medium",
        }),
        modelName,
      };
    case "o3-mini-high":
      return {
        model: new ChatOpenAI({
          model: "o3-mini",
          reasoningEffort: "high",
        }),
        modelName,
      };
    case "claude-3-7-sonnet":
      return {
        model: new ChatAnthropic({
          model: "claude-3-7-sonnet-20250219",
          temperature: 0,
        }),
        modelName,
      };
    case "claude-3-7-sonnet-thinking":
      return {
        model: new ChatAnthropic({
          model: "claude-3-7-sonnet-20250219",
          maxTokens: 1024 * 8,
          thinking: {
            type: "enabled",
            budget_tokens: 1024,
          },
        }),
        modelName,
      };

    case "gemini-2.0-flash":
      return {
        model: new ChatVertexAI({
          model: "gemini-2.0-flash-001",
          temperature: 0,
        }),
        modelName,
      };
    default:
      throw new Error(`Invalid MODEL: ${process.env.MODEL}`);
  }
};

const { model, modelName } = createModel();

const tavilySearchResultsTool = new TavilySearchResults({ maxResults: 5 });
const tools = [
  execCommandTool,
  tmuxTool,
  writeFileTool,
  patchFileTool,
  tavilySearchResultsTool,
  readWebPageTool,
  readWebPageByBrowserTool,
];

model.bindTools(tools, { parallel_tool_calls: false });

const checkpointSaver = new MemorySaver();

const agent = createReactAgent({
  llm: model,
  tools,
  checkpointSaver: checkpointSaver,
  interruptBefore: "*",
  prompt: new SystemMessage({
    content: [
      {
        type: "text",
        text: PROMPT,
        ...(model.model.startsWith("claude")
          ? {
              cache_control: { type: "ephemeral" },
            }
          : {}),
      },
    ],
  }),
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

const handleUserInput = async (input: string) => {
  const state = await agent.getState(config);
  if (state.next.includes("tools")) {
    if (/^(y|yes|ｙ)$/.test(input.trim())) {
      // Approved
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
      await agent.updateState(config, { messages: cancelMessages }, "tools");
    }
  } else {
    // No pending tool calls
    await agent.updateState(
      config,
      { messages: [new HumanMessage(input)] },
      "tools",
    );
  }

  await enableClaudePromptCaching();
  const updates: AgentUpdatesStream = await agent.stream(null, {
    ...config,
    streamMode: "updates",
  });
  await printAgentUpdatesStream(updates);

  while (true) {
    const updatedState = await agent.getState(config);

    if (updatedState.next.length === 0) {
      break;
    }

    if (updatedState.next.includes("agent")) {
      await enableClaudePromptCaching();
      const values: AgentUpdatesStream = await agent.stream(null, {
        ...config,
        streamMode: "updates",
      });
      await printAgentUpdatesStream(values);
      continue;
    }

    // Auto-approve tool calls
    if (updatedState.next.includes("tools")) {
      const lastMessage: AIMessage =
        updatedState.values.messages[updatedState.values.messages.length - 1];
      const isEveryToolCallApproved = lastMessage.tool_calls?.every(
        isAutoApprovableToolCall,
      );
      if (isEveryToolCallApproved) {
        console.log(styleText("green", "Tool calls auto-approved."));
        await enableClaudePromptCaching();
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
    }

    break;
  }
};

const enableClaudePromptCaching = async () => {
  const state = await agent.getState(config);
  const messages: BaseMessage[] = state.values.messages;
  const asNode =
    messages[messages.length - 1].getType() === "ai" ? "tools" : "agent";
  if (model.model.startsWith("claude") && messages.length % 5 === 0) {
    const cacheTargetIndices = [
      Math.floor(messages.length / 5) * 5,
      (Math.floor(messages.length / 5) - 1) * 5,
    ];
    const updatedMessage = messages.map((msg, index) => {
      if (cacheTargetIndices.includes(index)) {
        msg.content = Array.isArray(msg.content)
          ? msg.content.map((part) => ({
              ...part,
              cache_control: { type: "ephemeral" },
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
      if (Array.isArray(msg.content)) {
        msg.content = msg.content.map((part) => {
          if (typeof part === "object" && "cache_control" in part) {
            delete part.cache_control;
          }
          return part;
        });
        return msg;
      }
      return msg;
    });

    await agent.updateState(config, { messages: updatedMessage }, asNode);
  }
};

type AgentUpdatesStream = IterableReadableStream<
  | {
      agent: {
        messages: AIMessage[];
      };
    }
  | {
      tools: {
        messages: ToolMessage[];
      };
    }
>;

const printAgentUpdatesStream = async (values: AgentUpdatesStream) => {
  for await (const value of values) {
    if ("agent" in value) {
      for (const message of value.agent.messages) {
        console.log(styleText("bold", "\nAgent:"));

        if (typeof message.lc_kwargs.content === "string") {
          // OpenAI
          console.log(message.lc_kwargs.content);
        } else if (Array.isArray(message.lc_kwargs.content)) {
          // Claude
          for (const part of message.lc_kwargs.content) {
            if (typeof part["thinking"] === "string") {
              console.log(
                [
                  styleText("blue", "<thinking>"),
                  part["thinking"],
                  styleText("blue", "</thinking>"),
                ].join("\n"),
              );
            } else if (typeof part["text"] === "string") {
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

        for (const toolCall of message.tool_calls || []) {
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
              tmuxToolArgsUserPrinter(
                toolCall.args as z.infer<typeof tmuxTool.schema>,
              ),
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

        const usageMetadata: string[] = [];
        if (typeof message.usage_metadata === "object") {
          for (const prop of Object.keys(message.usage_metadata)) {
            const value = message.usage_metadata[prop as keyof UsageMetadata];
            if (typeof value === "number") {
              usageMetadata.push(`${prop}: ${value.toLocaleString()}`);
            }
          }
        }

        const usageMetadateInputTokenDetails: string[] = [];
        if (message.usage_metadata?.input_token_details) {
          for (const prop of Object.keys(
            message.usage_metadata.input_token_details,
          )) {
            const value =
              message.usage_metadata.input_token_details[
                prop as keyof InputTokenDetails
              ];
            if (typeof value === "number") {
              usageMetadateInputTokenDetails.push(
                `${prop}: ${value.toLocaleString()}`,
              );
            }
          }
        }

        const usageMetadateOutputTokenDetails: string[] = [];
        if (message.usage_metadata?.output_token_details) {
          for (const prop of Object.keys(
            message.usage_metadata.output_token_details,
          )) {
            const value =
              message.usage_metadata.output_token_details[
                prop as keyof OutputTokenDetails
              ];
            if (typeof value === "number") {
              usageMetadateOutputTokenDetails.push(
                `${prop}: ${value.toLocaleString()}`,
              );
            }
          }
        }

        console.log(
          styleText(
            "gray",
            [
              "\n",
              usageMetadata.join(", "),
              "\n",
              "(input) ",
              usageMetadateInputTokenDetails.join(", "),
              " / ",
              "(output) ",
              usageMetadateOutputTokenDetails.join(", "),
            ].join(""),
          ),
        );
      }
    }

    if ("tools" in value) {
      for (const message of value.tools.messages) {
        console.log(styleText("bold", "\nTool Result:"));
        console.log(`${message.name}`);

        if (message.name === execCommandTool.name) {
          const formattedOutput = execCommandToolOutputUserPrinter(
            message.content as string,
          );
          console.log(`\n${formattedOutput}`);
        } else if (message.name === tmuxTool.name) {
          const formattedOutput = tmuxToolOutputUserPrinter(
            message.content as string,
          );
          console.log(`\n${formattedOutput}`);
        } else {
          const contentString =
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content, null, 2);

          const maxContentLength = 1000;
          if (contentString.length > maxContentLength) {
            console.log(`\n${contentString.slice(0, maxContentLength)}...`);
          } else {
            console.log(`\n${contentString}`);
          }
        }
      }
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
      `\nSession: ${sessionId}, Model: ${modelName}, Commands: "resume work", "save memory", "bye"`,
    ) + "\n> ",
});

if (process.argv.length > 2) {
  console.log(`Reading file: ${process.argv[2]}`);
  handleUserInput(fs.readFileSync(process.argv[2], "utf8"))
    .then(() => {
      cli.prompt();
    })
    .catch((err) => {
      console.error(`Error reading file ${process.argv[2]}:`, err);
      process.exit(1);
    });
} else {
  cli.prompt();
}

cli.on("line", async (input) => {
  await handleUserInput(input);
  cli.prompt();
  cli.resume();
});
