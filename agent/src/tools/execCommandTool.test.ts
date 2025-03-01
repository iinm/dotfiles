import assert from "node:assert";
import { describe, it } from "node:test";

import { execCommandTool } from "./execCommandTool";

describe("execCommandTool", () => {
  it("captures stdout", async () => {
    // when:
    const result = await execCommandTool.invoke({
      command: "echo",
      args: ["Hello World"],
    });

    // then:
    assert.equal(
      result,
      `
<command>echo</command>

<stdout truncated="false">
Hello World
</stdout>

<stderr truncated="false"></stderr>
`.trim(),
    );
  });

  it("captures stderr", async () => {
    // when:
    const result = await execCommandTool.invoke({
      command: "node",
      args: ["-e", 'process.stderr.write("Hello from stderr")'],
    });

    // then:
    assert.equal(
      result,
      `
<command>node</command>

<stdout truncated="false"></stdout>

<stderr truncated="false">
Hello from stderr</stderr>
`.trim(),
    );
  });

  it("captures error", async () => {
    // when:
    const result = execCommandTool.invoke({
      command: "node",
      args: ["-e", "process.exit(1)"],
    });

    // then:
    await assert.rejects(result, {
      name: "Error",
      message: `
<command>node</command>

<stdout truncated="false"></stdout>

<stderr truncated="false"></stderr>

<error truncated="false">
Error: Command failed: node -e process.exit(1)
</error>
`.trim(),
    });
  });
});
