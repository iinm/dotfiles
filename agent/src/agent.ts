import { BaseMessageLike, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { Tool } from "@langchain/core/tools";
import {
  MemorySaver,
  addMessages,
  entrypoint,
  getPreviousState,
  interrupt,
  task,
} from "@langchain/langgraph";

import { enableClaudePromptCaching } from "./claude";
import { Model } from "./model";

export function createPrompt({
  threadId,
  cwd,
  agentDir,
}: {
  threadId: string;
  cwd: string;
  agentDir: string;
}) {
  return `
You are a problem solver.

- Solve problems provided by users.
- Clarify the essence of the problem by asking questions before proceeding.
- Clarify the goal of problem solving and confirm it with the user before proceeding.
- Divide the task into smaller parts, confirm the plan with the user, and then solve each part one by one.

# User Interactions

- Respond to users in the same language they use.
- Users specify file paths relative to the current working directory.
  - Crrent working directory: ${cwd}
- When user ends the conversation by saying "bye", "exit", or "quit", do the following steps one by one:
  - Kill the tmux session named agent-${threadId} if it is running.
  - Save the memory bank.

# Tools

Rules:
- Call one tool at a time.
- When a tool's output is not as expected, review it carefully and consider your next steps.
- If repeated attempts to call a tool fail, ask the user for feedback.

## exec command

exec_command is used to run a one-shot command.
Use tmux to run daemon processes and interactive processes.

- Current working directory is ${cwd}.
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
- Use the given sessionId ( agent-${threadId} ) to run the command.
- If it's not available, create a new session with the given sessionId.
- Current working directory is ${cwd}.
- Use relative paths to refer to files and directories.

Basic commands:
- Start session: new-session ['-d', '-s', 'agent-${threadId}']
- Detect window number to send keys: list-windows ['-t', 'agent-${threadId}']
- Get output of window before sending keys: capture-pane ['-p', '-t', 'agent-${threadId}:<window>']
- Send key to session: send-keys ['-t', 'agent-${threadId}:<window>, 'echo hello', 'Enter']
- Delete line: send-keys ['-t', 'agent-${threadId}:<window>, 'C-a', 'C-k']

Usecase: Browser automation (Experimental)
- Change directory to the directory where you have playwright installed.
  send-keys ['-t', 'agent-${threadId}:<window>, 'cd ${agentDir}', 'Enter']
- Start node.js interpreter.
  send-keys ['-t', 'agent-${threadId}:<window>, 'node', 'Enter']
- Open specified URL in the browser.
  send-keys ['-t', 'agent-${threadId}:<window>, 'const { chromium } = require("playwright")', 'Enter']
  send-keys ['-t', 'agent-${threadId}:<window>, 'const browser = await chromium.launch({ headless: false })', 'Enter']
  send-keys ['-t', 'agent-${threadId}:<window>, 'let page = await browser.newPage({ viewport: { width: 1280, height: 960 } })', 'Enter']
  send-keys ['-t', 'agent-${threadId}:<window>, 'await page.goto("http://example.com")', 'Enter']

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

Path: ${cwd}/.agent/memory/${threadId}--<snake-case-title>.md
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
}

export type Agent = ReturnType<typeof createAgent>;

export function createAgent({ model, tools }: { model: Model; tools: Tool[] }) {
  const toolsByName = Object.fromEntries(
    tools.map((tool) => [tool.name, tool]),
  );

  const callModel = task("callModel", async (messages: BaseMessageLike[]) => {
    if (!model.bindTools) {
      throw new Error(
        `Model must implement bindTools method. Model: ${model.name}`,
      );
    }
    const cacheEnabledMessages = enableClaudePromptCaching({
      model,
      messages,
      cacheInterval: 4,
    });

    const response = await model.bindTools(tools).invoke(cacheEnabledMessages);
    return response;
  });

  const callTool = task("callTool", async (toolCall: ToolCall) => {
    const tool = toolsByName[toolCall.name];
    if (!tool) {
      return new ToolMessage({
        name: toolCall.name,
        status: "error",
        content: `Tool not found: ${toolCall.name}`,
        tool_call_id: toolCall.id || "",
      });
    }

    try {
      const result = await tool.invoke(toolCall.args);
      return new ToolMessage({
        name: toolCall.name,
        status: "success",
        content: result,
        tool_call_id: toolCall.id || "",
      });
    } catch (err) {
      return new ToolMessage({
        name: toolCall.name,
        status: "error",
        content: `Error: ${err instanceof Error ? err.message : err}`,
        tool_call_id: toolCall.id || "",
      });
    }
  });

  const reviewToolCall = (toolCall: ToolCall): ToolCall | ToolMessage => {
    const humanReview = interrupt({
      question: "",
      tool_call: toolCall,
    });

    const { action, data } = humanReview;

    if (action === "continue") {
      return toolCall;
    }

    if (action === "feedback") {
      return new ToolMessage({
        content: `Cancelled by user. User feedback: ${data}`,
        name: toolCall.name,
        tool_call_id: toolCall.id || "",
      });
    }

    throw new Error(`Unsupported review action: ${action}`);
  };

  const checkpointer = new MemorySaver();

  const agent = entrypoint(
    {
      checkpointer,
      name: "agent",
    },
    async (messages: BaseMessageLike[]) => {
      const previous = getPreviousState<BaseMessageLike[]>() ?? [];
      let currentMessages = addMessages(previous, messages);
      let llmResponse = await callModel(currentMessages);
      while (true) {
        if (!llmResponse.tool_calls?.length) {
          break;
        }
        const toolResults: ToolMessage[] = [];
        const toolCalls: ToolCall[] = [];

        for (let i = 0; i < llmResponse.tool_calls.length; i++) {
          const review = reviewToolCall(llmResponse.tool_calls[i]);
          if (review instanceof ToolMessage) {
            toolResults.push(review);
          } else {
            toolCalls.push(review);
            if (review !== llmResponse.tool_calls[i]) {
              llmResponse.tool_calls[i] = review;
            }
          }
        }
        const remainingToolResults = await Promise.all(
          toolCalls.map((toolCall) => callTool(toolCall)),
        );

        currentMessages = addMessages(currentMessages, [
          llmResponse,
          ...toolResults,
          ...remainingToolResults,
        ]);

        llmResponse = await callModel(currentMessages);
      }

      currentMessages = addMessages(currentMessages, llmResponse);
      return entrypoint.final({
        value: llmResponse,
        save: currentMessages,
      });
    },
  );

  return agent;
}
