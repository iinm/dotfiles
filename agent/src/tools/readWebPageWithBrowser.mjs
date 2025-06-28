/**
 * @import { Tool } from '../tool'
 */

import path from "node:path";
import { AGENT_DIR } from "../env.mjs";
import { noThrow } from "../utils/noThrow.mjs";
import { writeTmpFile } from "../utils/tmpfile.mjs";

export const USER_DATA_DIR = path.join(AGENT_DIR, ".agent/chromium-profile");
const MAX_CONTENT_LENGTH = 1024 * 8;

/** @type {Tool} */
export const readWebPageWithBrowserTool = {
  def: {
    name: "read_web_page_with_browser",
    description: `Read and extract page content from a given URL using a browser, returning it as Markdown. Can handle JavaScript-rendered content. Note: If you encounter an error due to a missing browser, install it by running: bash ["-c", "cd ${AGENT_DIR} && npx playwright install chromium"]`,
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
      const { chromium } = await import("playwright");
      const { Readability } = await import("@mozilla/readability");
      const { JSDOM } = await import("jsdom");
      const TurndownService = (await import("turndown")).default;

      const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: true,
      });

      /** @type {string | undefined} */
      let html;
      try {
        const page = await context.newPage();
        await page.goto(input.url);
        try {
          await page.waitForLoadState("networkidle", { timeout: 10000 });
        } catch (_timeoutError) {
          console.warn(
            "Network idle timeout, proceeding with current page state",
          );
        }
        html = await page.content();
      } finally {
        await context.close();
      }

      const dom = new JSDOM(html, { url: input.url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article?.content) {
        return "";
      }

      const turndownService = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced",
      });

      const markdown = turndownService.turndown(article.content);
      const trimmedMarkdown = markdown.trim();

      if (trimmedMarkdown.length <= MAX_CONTENT_LENGTH) {
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
        "Use rg / sed to read specific parts",
      ].join("\n");
    }),
};

// Playground
// (async () => {
//   const input = {
//     url: "https://devin.ai/agents101",
//   };
//   console.log(await readWebPageWithBrowserTool.impl(input));
// })();
