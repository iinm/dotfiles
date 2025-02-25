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
    assert.equal(
      result,
      `
<stdout truncated="false">
Hello World
</stdout>
<stderr truncated="false">
</stderr>
`.trim(),
    );
  });

  it("captures stderr", async () => {
    // when:
    const result = await shellCommandTool.invoke({
      command: `>&2 echo "Hello World"`,
    });

    // then:
    assert.equal(
      result,
      `
<stdout truncated="false">
</stdout>
<stderr truncated="false">
Hello World
</stderr>
`.trim(),
    );
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
<stdout truncated="false">
Hello Stdout
</stdout>
<stderr truncated="false">
Hello Stderr
</stderr>
<error truncated="false">
Error: Command failed: bash -c "echo 'Hello Stdout' && echo 'Hello Stderr' >&2 && exit 1"
Hello Stderr
</error>
`.trim(),
    });
  });
});
