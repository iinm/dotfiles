import { fetchWebPageWithBrowserTool } from "./fetchWebPageWithBrowser.mjs";

(async () => {
  const input = {
    url: "https://devin.ai/agents101",
  };
  console.log(await fetchWebPageWithBrowserTool.impl(input));
})();
