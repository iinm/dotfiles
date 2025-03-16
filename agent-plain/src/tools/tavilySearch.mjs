/**
 * @import { Tool } from '../tool'
 * @import { TavilySearchInput } from './tavilySearch'
 */

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
  impl: async (input) => {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return new Error(
        `Failed to search: status=${response.status}, body=${await response.text()}`,
      );
    }

    const body = await response.json();
    return JSON.stringify(body);
  },
};

// Playground
// (async () => {
//   const input = {
//     query: "What is the capital of France?",
//   };
//   console.log(await tavilySearchTool.impl(input));
// })();
