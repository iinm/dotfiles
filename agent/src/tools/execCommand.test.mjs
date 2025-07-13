import assert from "node:assert";
import { describe, it } from "node:test";
import { execCommandTool } from "./execCommand.mjs";

describe("execCommandTool", () => {
  it("captures stdout", async () => {
    // when:
    const result = await execCommandTool.impl({
      command: "echo",
      args: ["Hello World"],
    });

    // then:
    assert.equal(
      result,
      `
<command>echo</command>
<args>["Hello World"]</args>

<stdout>
Hello World
</stdout>

<stderr></stderr>
`.trim(),
    );
  });

  it("captures stderr", async () => {
    // when:
    const result = await execCommandTool.impl({
      command: "node",
      args: ["-e", 'process.stderr.write("Hello from stderr")'],
    });

    // then:
    assert.equal(
      result,
      `
<command>node</command>
<args>["-e","process.stderr.write(\\"Hello from stderr\\")"]</args>

<stdout></stdout>

<stderr>
Hello from stderr</stderr>
`.trim(),
    );
  });

  it("captures error", async () => {
    // when:
    const result = await execCommandTool.impl({
      command: "node",
      args: ["-e", "process.exit(1)"],
    });

    // then:
    assert.equal(
      result,
      `
<command>node</command>
<args>["-e","process.exit(1)"]</args>

<stdout></stdout>

<stderr></stderr>

<error>
Error: Command failed: node -e process.exit(1)
</error>
`.trim(),
    );
  });
});
