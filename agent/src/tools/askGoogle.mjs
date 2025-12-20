/**
 * @import { Tool } from '../tool'
 */

import { noThrow } from "../utils/noThrow.mjs";

/**
 * @typedef {Object} AskGoogleInput
 * @property {string} question
 */

/**
 * @param {{geminiApiKey: string}} config
 * @returns {Tool}
 */
export function createAskGoogleTool(config) {
  return {
    def: {
      name: "ask_google",
      description: "Ask Google a question using natural language",
      inputSchema: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The question to ask Google",
          },
        },
        required: ["question"],
      },
    },

    /**
     * @param {AskGoogleInput} input
     * @returns {Promise<string | Error>}
     */
    impl: async (input) =>
      await noThrow(async () => {
        const model = "gemini-3-flash-preview";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const data = {
          contents: [
            {
              parts: [{ text: input.question }],
            },
          ],
          tools: [
            {
              google_search: {},
            },
          ],
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "x-goog-api-key": config.geminiApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(120 * 1000),
        });

        if (!response.ok) {
          return new Error(
            `Failed to ask Google: status=${response.status}, body=${await response.text()}`,
          );
        }

        const body = await response.json();

        const answer = body.candidates?.[0]?.content?.parts?.[0]?.text;

        if (typeof answer !== "string") {
          return new Error(
            `Unexpected response format from Google: ${JSON.stringify(body)}`,
          );
        }

        return answer;
      }),
  };
}
