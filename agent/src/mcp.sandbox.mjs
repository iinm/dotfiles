import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

(async () => {
  const client = new Client({
    name: "undefined",
    version: "undefined"
  });

  const transport = new StdioClientTransport({
    command: "npx",
    "args": [
      "@playwright/mcp@latest",
      "--headless",
    ]
  });

  await client.connect(transport)

  const navigateResult = await client.callTool({
    name: "browser_navigate",
    arguments: {
      url: "https://example.com"
    }
  });
  console.log(JSON.stringify(navigateResult, null, 2));
  // {
  //   content: [
  //     {
  //       type: "text",
  //       text: "Navigated to https://example.com\n\n- Page URL: https://example.com/\n- Page Title: Example Domain\n- Page Snapshot\n"
  //     }
  //   ]
  // }

  const screenshotResult = await client.callTool({
    name: "browser_take_screenshot",
    arguments: {},
  })
  console.log(JSON.stringify(screenshotResult, null, 2));
  // {
  //   content: [
  //     {
  //       type: "image",
  //       data: "/9j/4AAQSk...",
  //       mineType: "image/jpeg"
  //     }
  //   ]
  // }

  await client.close();
  process.exit(0);
})()
