/**
 * @import { Tool } from '../tool'
 */

import path from "node:path";
import { AGENT_CACHE_DIR } from "../env.mjs";
import { noThrow } from "../utils/noThrow.mjs";
import { writeTmpFile } from "../utils/tmpfile.mjs";

export const FETCH_WEB_PAGE_WITH_BROWSER_TOOL_USER_DATA_DIR = path.join(
  AGENT_CACHE_DIR,
  "chromium-profile",
);

const MAX_CONTENT_LENGTH = 1024 * 8;

/** @type {Tool} */
export const fetchWebPageWithBrowserTool = {
  def: {
    name: "fetch_web_page_with_browser",
    description:
      "Fetch and extract web page content from a given URL using a browser (via Puppeteer), returning it as Markdown. Can handle JavaScript-rendered content.",
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
      const puppeteer = (await import("puppeteer")).default;
      const { Readability } = await import("@mozilla/readability");
      const { JSDOM } = await import("jsdom");
      const TurndownService = (await import("turndown")).default;

      const browser = await puppeteer.launch({
        headless: true,
        // Persist profile to speed up repeated visits and keep cookies/localStorage
        userDataDir: FETCH_WEB_PAGE_WITH_BROWSER_TOOL_USER_DATA_DIR,
      });

      /** @type {string | undefined} */
      let html;
      try {
        const page = await browser.newPage();
        try {
          await page.goto(input.url, {
            waitUntil: "networkidle0",
            timeout: 30_000,
          });
        } catch (_timeoutError) {
          console.warn(
            "Network idle timeout, proceeding with current page state",
          );
        }
        html = await page.content();
        await page.close();
      } finally {
        await browser.close();
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
        "Use rg / awk to read specific parts",
      ].join("\n");
    }),
};
