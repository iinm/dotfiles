import { styleText } from "node:util";

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Tool } from "@langchain/core/tools";

import { createAgent, createPrompt } from "./agent";
import { startCLI } from "./cli";
import { createModel } from "./model";
import { execCommandTool } from "./tools/execCommandTool";
import { patchFileTool } from "./tools/patchFileTool";
import { readWebPageByBrowserTool } from "./tools/readWebPageByUserBrowserTool";
import { readWebPageTool } from "./tools/readWebPageTool";
import { tmuxTool } from "./tools/tmuxTool";
import { writeFileTool } from "./tools/writeFileTool";

const AGENT_MODEL = process.env.AGENT_MODEL || "claude-3-5-haiku";

(async () => {
  const model = await createModel(AGENT_MODEL);

  const tavilySearchResultsTool = new TavilySearchResults({ maxResults: 5 });
  const tools = [
    execCommandTool,
    tmuxTool,
    writeFileTool,
    patchFileTool,
    readWebPageTool,
    readWebPageByBrowserTool,
    tavilySearchResultsTool,
  ];

  const agent = createAgent({ model, tools: tools as Tool[] });

  const startTime = new Date();
  // e.g. 2025-12-31-2359
  const threadId =
    startTime.toISOString().slice(0, 10) +
    "-" +
    ("0" + startTime.getHours()).slice(-2) +
    ("0" + startTime.getMinutes()).slice(-2);

  const prompt = createPrompt({
    threadId,
    workingDir: process.cwd(),
    agentDir: __dirname,
  });

  await startCLI({ model, agent, threadId, prompt, workingDir: process.cwd() });
})().catch((err) => {
  console.error(styleText("red", err.stack));
  process.exit(1);
});
