import assert from "node:assert";
import { describe, it } from "node:test";
import { createExecCommandTool } from "./execCommand.mjs";

describe("execCommandTool", () => {
  const execCommandTool = createExecCommandTool();

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
<stdout></stdout>

<stderr></stderr>

<error>
Error: Command failed: node -e process.exit(1)
</error>
`.trim(),
    );
  });

  it("prevents hanging commands by closing stdin", async () => {
    // when:
    const result = await execCommandTool.impl({
      command: "cat",
      args: [],
    });

    // then:
    assert.equal(
      result,
      `
<stdout></stdout>

<stderr></stderr>
`.trim(),
    );
  });

  it("validates input command", () => {
    assert.ok(execCommandTool.validateInput);
    if (execCommandTool.validateInput) {
      assert.ok(!execCommandTool.validateInput({ command: "ls" }));
      assert.ok(
        execCommandTool.validateInput({ command: "-v" }) instanceof Error,
      );
      assert.equal(
        execCommandTool.validateInput({ command: "-v" })?.message,
        "command must not start with '-'",
      );
    }
  });

  it("runs command in sandbox", async () => {
    // given:
    const execCommandToolWithSandbox = createExecCommandTool({
      sandbox: {
        command: "echo",
        args: ["THIS_IS_SANDBOX"],
        rules: [
          {
            pattern: {
              command: "echo",
            },
            mode: "unsandboxed",
          },
          {
            pattern: {
              command: "target-command",
              args: ["--target-command-arg"],
            },
            mode: "sandbox",
            additionalArgs: ["--sandbox-additional-arg"],
          },
        ],
      },
    });

    // when: input matches unsandboxed rule
    const result1 = await execCommandToolWithSandbox.impl({
      command: "echo",
      args: ["THIS_IS_NOT_SANDBOX"],
    });

    // then: run the command directly without sandboxing
    assert.equal(
      result1,
      `
<stdout>
THIS_IS_NOT_SANDBOX
</stdout>

<stderr></stderr>
`.trim(),
    );

    // when: input matches sandbox rule
    const result2 = await execCommandToolWithSandbox.impl({
      command: "target-command",
      args: ["--target-command-arg"],
    });

    // then: run the command in sandbox with additional args
    assert.equal(
      result2,
      `
<stdout>
THIS_IS_SANDBOX --sandbox-additional-arg target-command --target-command-arg
</stdout>

<stderr></stderr>
`.trim(),
    );

    // when: input does not match rule
    const result3 = await execCommandToolWithSandbox.impl({
      command: "non-target-command",
      args: ["--non-target-command-arg"],
    });

    // then: run the command in sandbox
    assert.equal(
      result3,
      `
<stdout>
THIS_IS_SANDBOX non-target-command --non-target-command-arg
</stdout>

<stderr></stderr>
`.trim(),
    );
  });
});
