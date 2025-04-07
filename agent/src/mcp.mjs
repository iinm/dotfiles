/**
 * @import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
 * @import { Tool, ToolImplementation } from "./tool";
 * @import { Client } from "@modelcontextprotocol/sdk/client/index.js";
 */

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
  const tools = mcpTools.map((tool) => ({
    def: {
      name: `mcp-${tool.name}`,
      description: tool.description || `${tool.name} tool`,
      inputSchema: /** @type {Record<string, unknown>} */ (tool.inputSchema),
    },
    /** @type {ToolImplementation} */
    impl: async (input) =>
      noThrow(async () => {
        const result = await client.callTool({
          name: tool.name,
          arguments: input,
        });
        // TODO: use structured result
        return JSON.stringify(result);
      }),
  }));

  return tools;
}
