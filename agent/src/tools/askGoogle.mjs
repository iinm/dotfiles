/**
 * @import { Tool } from '../tool'
 */

import { styleText } from "node:util";
import { getGoogleCloudAccessToken } from "../providers/googleCloud.mjs";
import { noThrow } from "../utils/noThrow.mjs";

/**
 * @typedef {Object} AskGoogleToolOptions
 * @property {"vertex-ai"=} platform
 * @property {string=} baseURL
 * @property {string=} apiKey - API key for Google AI Studio
 * @property {string=} account - The Google Cloud account to use for Vertex AI
 * @property {string=} model
 */

/**
 * @typedef {Object} AskGoogleInput
 * @property {string} question
 */

/**
 * @param {AskGoogleToolOptions} config
 * @returns {Tool}
 */
export function createAskGoogleTool(config) {
  /**
   * @param {AskGoogleInput} input
   * @param {number} retryCount
   * @returns {Promise<string | Error>}
   */
  async function askGoogle(input, retryCount = 0) {
    const model = config.model ?? "gemini-3-flash-preview";
    const url =
      config.platform === "vertex-ai" && config.baseURL
        ? `${config.baseURL}/publishers/google/models/${model}:generateContent`
        : config.baseURL
          ? `${config.baseURL}/models/${model}:generateContent`
          : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    /** @type {Record<string,string>} */
    const authHeader =
      config.platform === "vertex-ai"
        ? {
            Authorization: `Bearer ${await getGoogleCloudAccessToken(config.account)}`,
          }
        : {
            "x-goog-api-key": config.apiKey ?? "",
          };

    const data = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `I need a comprehensive answer to this question. Please note that I don't have access to external URLs, so include all relevant facts, data, or explanations directly in your response. Avoid referencing links I can't open.

Question: ${input.question}`,
            },
          ],
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
        ...authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(120 * 1000),
    });

    if (response.status === 429 || response.status >= 500) {
      const interval = Math.min(2 * 2 ** retryCount, 16);
      console.error(
        styleText(
          "yellow",
          `Google API returned ${response.status}. Retrying in ${interval} seconds...`,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      return askGoogle(input, retryCount + 1);
    }

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
  }

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
    impl: async (input) => await noThrow(async () => askGoogle(input, 0)),
  };
}
