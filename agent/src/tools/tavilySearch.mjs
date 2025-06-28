/**
 * @import { Tool } from '../tool'
 * @import { TavilySearchInput } from './tavilySearch'
 */

import { noThrow } from "../utils/noThrow.mjs";

/** @type {Tool} */
export const tavilySearchTool = {
  def: {
    name: "web_search",
    description: "Search the web for information",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
        },
      },
      required: ["query"],
    },
  },

  /**
   * @param {TavilySearchInput} input
   * @returns {Promise<string | Error>}
   */
  impl: async (input) =>
    await noThrow(async () => {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...input,
          max_results: 5,
        }),
        signal: AbortSignal.timeout(120 * 1000),
      });

      if (!response.ok) {
        return new Error(
          `Failed to search: status=${response.status}, body=${await response.text()}`,
        );
      }

      const body = await response.json();
      return JSON.stringify(body);
    }),
};

// Playground
// (async () => {
//   const input = {
//     query: "What is the capital of France?",
//   };
//   console.log(await tavilySearchTool.impl(input));
// })();
