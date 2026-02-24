/**
 * @import { Tool } from '../tool'
 * @import { ExecCommandConfig, ExecCommandInput, ExecCommandSanboxConfig } from './execCommand'
 */

import { execFile } from "node:child_process";
import { matchValue } from "../utils/matchValue.mjs";
import { noThrow } from "../utils/noThrow.mjs";
import { writeTmpFile } from "../utils/tmpfile.mjs";

const OUTPUT_MAX_LENGTH = 1024 * 8;
const OUTPUT_TRUNCATED_LENGTH = 1024 * 2;

/**
 * @param {ExecCommandConfig=} config
 * @returns {Tool}
 */
export function createExecCommandTool(config) {
  /** @type {Tool} */
  return {
    def: {
      name: "exec_command",
      description: "Run a command without shell interpretation.",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            description: "The executable name or path. e.g., rg",
            type: "string",
          },
          args: {
            description:
              "Array of arguments to pass to the command. Do not include the command name itself in this array.",
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: ["command"],
      },
    },

    validateInput: (input) => {
      if (typeof input.command !== "string") {
        return new Error("command must be a string");
      }
      if (input.command.startsWith("-")) {
        return new Error("command must not start with '-'");
      }
      if (input.args && !Array.isArray(input.args)) {
        return new Error("args must be an array of strings");
      }
      return;
    },

    /**
     * @param {ExecCommandInput} input
     * @returns {Promise<string | Error>}
     */
    impl: async (input) =>
      await noThrow(async () => {
        const { command, args } = config?.sandbox
          ? rewriteInputForSandbox(input, config.sandbox)
          : input;
        return new Promise((resolve, _reject) => {
          const child = execFile(
            command,
            args,
            {
              shell: false,
              env: {
                PWD: process.env.PWD,
                PATH: process.env.PATH,
                HOME: process.env.HOME,
              },
              timeout: 5 * 60 * 1000,
            },
            async (err, stdout, stderr) => {
              /**
               * @param {string} content
               * @param {string} type
               * @returns {Promise<string>}
               */
              const formatOutput = async (content, type) => {
                if (content.length <= OUTPUT_MAX_LENGTH) {
                  return content;
                }

                const prefix = `exec_command-${type}`;
                const filePath = await writeTmpFile(content, prefix, "txt");
                const lineCount = content.split("\n").length;

                const head = content.slice(0, OUTPUT_TRUNCATED_LENGTH);
                const tail = content.slice(
                  Math.max(content.length - OUTPUT_TRUNCATED_LENGTH, 0),
                );

                return [
                  `Content is too large (${content.length} characters, ${lineCount} lines). Saved to ${filePath}.`,
                  `<truncated_output part="start" length="${OUTPUT_TRUNCATED_LENGTH}" total_length="${content.length}">\n${head}\n</truncated_output>`,
                  `<truncated_output part="end" length="${OUTPUT_TRUNCATED_LENGTH}" total_length="${content.length}">\n${tail}</truncated_output>\n`,
                ].join("\n\n");
              };

              const stdoutOrMessage = await formatOutput(stdout, "stdout");
              const stderrOrMessage = await formatOutput(stderr, "stderr");

              const result = [
                stdoutOrMessage
                  ? `<stdout>\n${stdoutOrMessage}</stdout>`
                  : "<stdout></stdout>",
                "",
                stderrOrMessage
                  ? `<stderr>\n${stderrOrMessage}</stderr>`
                  : "<stderr></stderr>",
              ];

              if (err) {
                // rg: 何もマッチしない場合は exit status != 0 になるので無視
                const ignoreError = [command, ...(args || [])].includes("rg");
                if (!ignoreError) {
                  // err.message が長過ぎる場合は先頭を表示
                  const errMessageTruncated = err.message.slice(
                    0,
                    OUTPUT_TRUNCATED_LENGTH,
                  );
                  const isErrMessageTruncated =
                    err.message.length > OUTPUT_MAX_LENGTH;
                  result.push(
                    `\n<error>\n${err.name}: ${errMessageTruncated}${isErrMessageTruncated ? "... (Message truncated)" : ""}</error>`,
                  );
                }
              }
              return resolve(result.join("\n"));
            },
          );
          child.stdin?.end();
        });
      }),
  };
}

/**
 * @param {ExecCommandInput} input
 * @param {ExecCommandSanboxConfig} sandbox
 * @returns {ExecCommandInput}
 */
function rewriteInputForSandbox(input, sandbox) {
  const matchedRule = (sandbox.rules || []).find((rule) =>
    matchValue(input, rule.pattern),
  );

  if (matchedRule?.mode === "unsandboxed") {
    return input;
  }

  const args = [
    ...(sandbox.args || []),
    ...(matchedRule?.additionalArgs || []),
  ];

  if (sandbox.separator) {
    args.push(sandbox.separator);
  }

  args.push(input.command);

  if (input.args) {
    args.push(...input.args);
  }

  return {
    command: sandbox.command,
    args,
  };
}
