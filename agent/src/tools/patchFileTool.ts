import fs from "node:fs";

import { tool } from "@langchain/core/tools";

import z from "zod";

export const patchFileTool = tool(
  async (input) => {
    const { path, diff } = input;
    const content = fs.readFileSync(path, "utf8");
    const matches = diff.matchAll(
      /<<<<<<< SEARCH\n(.*?)\n=======\n(.*?)\n>>>>>>> REPLACE/gs,
    );
    let newContent = content;
    for (const match of matches) {
      const [_, search, replace] = match;
      if (!newContent.includes(search)) {
        throw new Error(`Search content not found: ${search}`);
      }
      newContent = newContent.replace(search, replace);
    }
    fs.writeFileSync(path, newContent);
    return `Patched file: ${path}`;
  },
  {
    name: "patch_file",
    description: "Patch a file.",
    schema: z.object({
      path: z.string().describe("The file path."),
      diff: z.string().describe(`
The diff to apply to the file.

Format:
<<<<<<< SEARCH
(content to be removed)
=======
(new content to replace the removed content)
>>>>>>> REPLACE

<<<<<<< SEARCH
(second content to be removed)
=======
(new content to replace the second removed content)
>>>>>>> REPLACE

...
`),
    }),
  },
);
