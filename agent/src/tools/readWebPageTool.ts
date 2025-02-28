import { tool } from "@langchain/core/tools";
import { Readability } from "@mozilla/readability";

import { JSDOM } from "jsdom";
import z from "zod";

const MAX_CONTENT_LENGTH = 10000;

export const readWebPageTool = tool(
  async ({ url }: { url: string }) => {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    const content = article?.textContent.trim() || "";
    if (content.length > MAX_CONTENT_LENGTH) {
      return content.substring(0, MAX_CONTENT_LENGTH) + " [truncated]";
    }
    return content;
  },
  {
    name: "read_web_page",
    description:
      "Fetches page content from a given URL and extracts only the main text content.",
    schema: z.object({
      url: z.string().describe("The URL to fetch content from."),
    }),
  },
);
