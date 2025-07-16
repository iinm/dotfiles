/**
 * @import { Client } from "@modelcontextprotocol/sdk/client/index.js";
 * @import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
 * @import { StructuredToolResultContent, Tool, ToolImplementation } from "./tool";
 * @import { MCPServerConfig } from "./config";
 */

import { noThrow } from "./utils/noThrow.mjs";
import { writeTmpFile } from "./utils/tmpfile.mjs";

/**
 * @typedef {Object} StartMCPServrResult
 * @property {Tool[]} tools
 * @property {() => Promise<void>} cleanup
 */

/**
 * @param {string} serverName
 * @param {MCPServerConfig} serverConfig
 * @returns {Promise<StartMCPServrResult>}
 */
export async function connectToMCPServer(serverName, serverConfig) {
  const { options, ...params } = serverConfig;

  const mcpClient = await createMCPClient({
    serverName,
    params,
  });

  const tools = (await createMCPTools(serverName, mcpClient)).filter(
    (tool) =>
      !options?.enabledTools ||
      options.enabledTools.find((enabledToolName) =>
        tool.def.name.endsWith(`__${enabledToolName}`),
      ),
  );

  return {
    tools,
    cleanup: () => mcpClient.close(),
  };
}

/**
 * @typedef {Object} MCPClientOptions
 * @property {string} serverName - The name of the MCP server.
 * @property {StdioServerParameters} params - The transport to use for the client.
 */

/**
 * @param {MCPClientOptions} options - The options for the client.
 * @returns {Promise<Client>} - The MCP client.
 */
async function createMCPClient(options) {
  const mcpClient = await import("@modelcontextprotocol/sdk/client/index.js");
  const mcpClientStdio = await import(
    "@modelcontextprotocol/sdk/client/stdio.js"
  );

  const client = new mcpClient.Client({
    name: "undefined",
    version: "undefined",
  });

  const { env, ...restParams } = options.params;
  const defaultEnv = {
    PWD: process.env.PWD || "",
    PATH: process.env.PATH || "",
    HOME: process.env.HOME || "",
  };

  const transport = new mcpClientStdio.StdioClientTransport({
    ...restParams,
    env: env ? { ...defaultEnv, ...env } : undefined,
  });
  await client.connect(transport);

  return client;
}

/**
 * @param {string} serverName
 * @param {Client} client - The MCP client.
 * @returns {Promise<Tool[]>} - The list of tools.
 */
async function createMCPTools(serverName, client) {
  const { tools: mcpTools } = await client.listTools();
  /** @type {Tool[]} */
  const tools = mcpTools
    .filter((tool) => {
      // Remove unsupported tools
      return ![""].includes(tool.name);
    })
    .map((tool) => {
      return {
        def: {
          name: `mcp__${serverName}__${tool.name}`,
          description: tool.description || `${tool.name} tool`,
          inputSchema: tool.inputSchema,
        },

        /** @type {ToolImplementation} */
        impl: async (input) =>
          noThrow(async () => {
            const result = await client.callTool({
              name: tool.name,
              arguments: input,
            });

            const resultStringRaw = JSON.stringify(result, null, 2);

            /** @type {StructuredToolResultContent[]} */
            const contentParts = [];
            /** @type {string[]} */
            const contentStrings = [];
            let contentContainsImage = false;
            if (Array.isArray(result.content)) {
              for (const part of result.content) {
                if ("text" in part && typeof part.text === "string") {
                  contentParts.push({
                    type: "text",
                    text: part.text,
                  });
                  contentStrings.push(part.text);
                } else if (
                  part.type === "image" &&
                  typeof part.mimeType === "string" &&
                  typeof part.data === "string"
                ) {
                  contentParts.push({
                    type: "image",
                    data: part.data,
                    mimeType: part.mimeType,
                  });
                  contentContainsImage = true;
                } else {
                  console.error(
                    `Unsupported content part from MCP: ${JSON.stringify(part)}`,
                  );
                }
              }
            }

            if (contentContainsImage) {
              return contentParts;
            }

            const resultString = contentStrings.join("\n\n") || resultStringRaw;

            if (resultString.length <= 1024 * 8) {
              return resultString;
            }

            const filePath = await writeTmpFile(resultString, tool.name, "txt");

            const lineCount = resultString.split("\n").length;

            return [
              `Content is large (${resultString.length} characters, ${lineCount} lines) and saved to ${filePath}`,
              '- Use exec_command head ["-c", "1000"] to get content format',
              "- Use rg / sed / jq to read specific parts",
            ].join("\n");
          }),
      };
    });

  return tools;
}
