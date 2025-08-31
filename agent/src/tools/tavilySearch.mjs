/**
 * @import { Tool } from '../tool'
 * @import { TavilySearchInput } from './tavilySearch'
 */

import { noThrow } from "../utils/noThrow.mjs";

/**
 * @param {{apiKey?: string}} config
 * @returns {Tool}
 */
export function createTavilySearchTool(config) {
  return {
    def: {
      name: "search_web",
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
            Authorization: `Bearer ${config.apiKey}`,
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
}
