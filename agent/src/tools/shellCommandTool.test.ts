import assert from "node:assert";
import { describe, it } from "node:test";

import { shellCommandTool } from "./shellCommandTool";

describe("shellCommandTool", () => {
  it("captures stdout", async () => {
    // when:
    const result = await shellCommandTool.invoke({
      command: `echo "Hello World"`,
    });

    // then:
    assert.equal(result, "<stdout>Hello World\n</stdout>\n<stderr></stderr>");
  });

  it("captures stderr", async () => {
    // when:
    const result = await shellCommandTool.invoke({
      command: `>&2 echo "Hello World"`,
    });

    // then:
    assert.equal(result, "<stdout></stdout>\n<stderr>Hello World\n</stderr>");
  });

  it("captures error with output", async () => {
    // when:
    const result = shellCommandTool.invoke({
      command: `bash -c "echo 'Hello Stdout' && echo 'Hello Stderr' >&2 && exit 1"`,
    });

    // then:
    await assert.rejects(result, {
      name: "Error",
      message: `
<stdout>Hello Stdout
</stdout>
<stderr>Hello Stderr
</stderr>
<error>Error: Command failed: bash -c "echo 'Hello Stdout' && echo 'Hello Stderr' >&2 && exit 1"
Hello Stderr
</error>
`.trim(),
    });
  });
});
