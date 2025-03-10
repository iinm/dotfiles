import { tool } from "@langchain/core/tools";
import { Readability } from "@mozilla/readability";

import { JSDOM } from "jsdom";
import * as path from "path";
import { chromium } from "playwright";
import z from "zod";

export const USER_DATA_DIR = path.join(
  __dirname,
  "../../.agent/chrome-profile",
);

const MAX_CONTENT_LENGTH = 1024 * 8;

export const readWebPageByBrowserTool = tool(
  async ({ url }: { url: string }) => {
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
    });

    try {
      const page = await context.newPage();
      await page.goto(url);
      await page.waitForTimeout(5000);
      const html = await page.content();

      // extract main content
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      const content = article?.textContent?.trim() || "";

      // truncate content if too long
      if (content.length > MAX_CONTENT_LENGTH) {
        return content.substring(0, MAX_CONTENT_LENGTH) + " [truncated]";
      }
      return content;
    } catch (err) {
      if (err instanceof Error) {
        console.error(
          `Error fetching page: message=${err.message}, stack=${err.stack}`,
        );
      }
      throw err;
    } finally {
      await context.close();
    }
  },
  {
    name: "read_web_page_by_browser",
    description: `Fetches main content from a given URL using a user browser.`,
    schema: z.object({
      url: z.string().describe("The URL to fetch content from."),
    }),
  },
);
