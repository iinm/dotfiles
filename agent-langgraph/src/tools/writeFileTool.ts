import fs from "node:fs";

import { tool } from "@langchain/core/tools";

import z from "zod";

export const writeFileTool = tool(
  async (input) => {
    const { path, content } = input;
    return new Promise((resolve, reject) => {
      fs.writeFile(path, content, (error) => {
        if (error) {
          reject(error);
        }
        resolve(`Wrote to file: ${path}`);
      });
    });
  },
  {
    name: "write_to_file",
    description: "Write to a file.",
    schema: z.object({
      path: z.string().describe("The file path."),
      content: z.string().describe("The content of the file."),
    }),
  },
);

export const writeFileToolArgsUserPrinter = (
  args: z.infer<typeof writeFileTool.schema>,
) => {
  return [`path: ${args.path}`, `content:\n${args.content}`].join("\n");
};
