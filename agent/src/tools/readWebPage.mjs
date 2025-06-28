/**
 * @import { Tool } from '../tool'
 */

import { noThrow } from "../utils/noThrow.mjs";
import { writeTmpFile } from "../utils/tmpfile.mjs";

/** @type {Tool} */
export const readWebPageTool = {
  def: {
    name: "read_web_page",
    description:
      "Read and extract page content from a given URL, returning it as Markdown",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
        },
      },
      required: ["url"],
    },
  },

  /**
   * @param {{url: string}} input
   * @returns {Promise<string | Error>}
   */
  impl: async (input) =>
    await noThrow(async () => {
      const { Readability } = await import("@mozilla/readability");
      const { JSDOM } = await import("jsdom");
      const TurndownService = (await import("turndown")).default;

      const response = await fetch(input.url);
      const html = await response.text();
      const dom = new JSDOM(html, { url: input.url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article?.content) {
        return "";
      }

      // Convert HTML to Markdown
      const turndownService = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced",
      });

      const markdown = turndownService.turndown(article.content);
      const trimmedMarkdown = markdown.trim();

      // If content is large (>8KB), save to file and return path
      if (trimmedMarkdown.length <= 1024 * 8) {
        return trimmedMarkdown;
      }

      const filePath = await writeTmpFile(
        trimmedMarkdown,
        "read_web_page",
        "md",
      );

      const lineCount = trimmedMarkdown.split("\n").length;

      return [
        `Content is large (${trimmedMarkdown.length} characters, ${lineCount} lines) and saved to ${filePath}`,
        "- Use rg / sed to read specific parts",
      ].join("\n");
    }),
};

// Playground
// (async () => {
//   const input = {
//     url: "https://devin.ai/agents101",
//   };
//   console.log(await readWebPage.impl(input));
// })();
