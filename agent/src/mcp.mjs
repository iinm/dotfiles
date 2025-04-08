/**
 * @import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
 * @import { Tool, ToolImplementation } from "./tool";
 * @import { Client } from "@modelcontextprotocol/sdk/client/index.js";
 */

import fs from "node:fs";
import path from "node:path";
import { AGENT_PROJECT_METADATA_DIR } from "./config.mjs";
import { noThrow } from "./utils/noThrow.mjs";

/**
 * @typedef {Object} MCPClientOptions
 * @property {string} name - The name of the client.
 * @property {StdioServerParameters} params - The transport to use for the client.
 */

/**
 * @param {MCPClientOptions} options - The options for the client.
 * @returns {Promise<Client>} - The MCP client.
 */
export async function createMCPClient(options) {
  const mcpClientModule = await import(
    "@modelcontextprotocol/sdk/client/index.js"
  );
  const mcpClientStdioModule = await import(
    "@modelcontextprotocol/sdk/client/stdio.js"
  );
  const client = new mcpClientModule.Client({
    name: "undefined",
    version: "undefined",
  });
  const transport = new mcpClientStdioModule.StdioClientTransport(
    options.params,
  );
  await client.connect(transport);
  return client;
}

/**
 * @param {Client} client - The MCP client.
 * @returns {Promise<Tool[]>} - The list of tools.
 */
export async function createMCPTools(client) {
  const { tools: mcpTools } = await client.listTools();
  /** @type {Tool[]} */
  const tools = mcpTools
    .filter((tool) => {
      // Remove unsupported tools
      return ![
        // Playwright
        "browser_take_screenshot",
      ].includes(tool.name);
    })
    .map((tool) => {
      // Remove properties that are not supported by Gemini
      const inputSchema = { ...tool.inputSchema };
      if ("$schema" in inputSchema) {
        delete inputSchema.$schema;
      }
      if ("additionalProperties" in inputSchema) {
        delete inputSchema.additionalProperties;
      }

      return {
        def: {
          name: `mcp-${tool.name}`,
          description: tool.description || `${tool.name} tool`,
          inputSchema: /** @type {Record<string, unknown>} */ (inputSchema),
        },

        /** @type {ToolImplementation} */
        impl: async (input) =>
          noThrow(async () => {
            const result = await client.callTool({
              name: tool.name,
              arguments: input,
            });

            const resultStringRaw = JSON.stringify(result, null, 2);

            /** @type {string[]} */
            const contentStrings = [];
            if (Array.isArray(result.content)) {
              for (const part of result.content) {
                if ("text" in part && typeof part.text === "string") {
                  contentStrings.push(part.text);
                } else {
                  console.warn("Unsupported content part from MCP:", part);
                }
              }
            }

            const resultString = contentStrings.join("\n\n") || resultStringRaw;

            if (resultString.length <= 1024 * 8) {
              return resultString;
            }

            const timestamp = new Date()
              .toISOString()
              .slice(0, 19)
              .replace("T", "-")
              .replace(/:/g, "");
            const tmpDir = `${AGENT_PROJECT_METADATA_DIR}/tmp`;
            const filePath = path.join(
              tmpDir,
              `${timestamp}--${tool.name}.txt`,
            );
            await fs.promises.mkdir(tmpDir, { recursive: true });
            await fs.promises.writeFile(filePath, resultString, "utf8");

            return `Result is saved to ${filePath}. Read it with rg / sed command.`;
          }),
      };
    });

  return tools;
}
