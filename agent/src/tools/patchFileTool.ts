import fs from "node:fs";
import { styleText } from "node:util";

import { tool } from "@langchain/core/tools";

import z from "zod";

export const patchFileTool = tool(
  async (input) => {
    const { path, diff } = input;
    const content = fs.readFileSync(path, "utf8");
    const matches = Array.from(
      diff.matchAll(
        /<<<<<<< SEARCH\n(.*?)\n?=======\n(.*?)\n?>>>>>>> REPLACE/gs,
      ),
    );
    if (matches.length === 0) {
      throw new Error(
        `
No matches found in diff.

Expected format:
\`\`\`
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
\`\`\`

- <<<<<<< SEARCH (7 < characters + SEARCH) is the start of the search content.
- ======= (7 = characters) is the separator between the search and replace content.
- >>>>>>> REPLACE (7 > characters + REPLACE) is the end of the replace content.

Rules:
- Content is searched as an exact match including indentation and line breaks.
- The first match found will be replaced if there are multiple matches.
- Use multiple SEARCH/REPLACE blocks to replace multiple contents.
`.trim(),
      );
    }
    let newContent = content;
    for (const match of matches) {
      const [_, search, replace] = match;
      if (!newContent.includes(search)) {
        throw new Error(JSON.stringify(`Search content not found: ${search}`));
      }
      newContent =
        replace === "" && newContent.includes(search + "\n")
          ? newContent.replace(search + "\n", replace)
          : replace === "" && newContent.includes("\n" + search)
            ? newContent.replace("\n" + search, replace)
            : newContent.replace(search, replace);
    }
    fs.writeFileSync(path, newContent);
    return `Patched file: ${path}`;
  },
  {
    name: "patch_file",
    description: "Patch a file.",
    schema: z.object({
      path: z.string().describe("The file path."),
      diff: z
        .string()
        .describe(
          "The diff to apply to the file in SEARCH/REPLACE format. See prompt for details.",
        ),
    }),
  },
);

export const patchFileToolArgsUserPrinter = (
  args: z.infer<typeof patchFileTool.schema>,
) => {
  const highlightedDiff = args.diff.replace(
    /<<<<<<< SEARCH\n(.*?)\n?=======\n(.*?)\n?>>>>>>> REPLACE/gs,
    (_match, search, replace) => {
      return [
        "<<<<<<< SEARCH",
        styleText("red", search),
        "=======",
        styleText("green", replace),
        ">>>>>>> REPLACE",
      ].join("\n");
    },
  );
  return [`path: ${args.path}`, `diff:\n${highlightedDiff}`].join("\n");
};
