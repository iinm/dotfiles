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
              'Array of arguments to pass to the command. Important: Include only the arguments that follow the command name. e.g., for "rg --line-number pattern file.txt", set command to "rg" and args to ["--line-number", "pattern", "file.txt"].',
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
              let stdoutOrMessage = stdout;
              if (stdout.length > OUTPUT_MAX_LENGTH) {
                const filePath = await writeTmpFile(
                  stdout,
                  "exec_command",
                  "txt",
                );
                const lineCount = stdout.split("\n").length;
                stdoutOrMessage = (() => {
                  const head = stdout.slice(0, OUTPUT_TRUNCATED_LENGTH);
                  const tail = stdout.slice(
                    Math.max(stdout.length - OUTPUT_TRUNCATED_LENGTH, 0),
                  );
                  return [
                    `Content is too large (${stdout.length} characters, ${lineCount} lines). Saved to ${filePath}.`,
                    `<truncated_output part="start" length="${OUTPUT_TRUNCATED_LENGTH}" total_length="${stdout.length}">\n${head}\n</truncated_output>`,
                    `<truncated_output part="end" length="${OUTPUT_TRUNCATED_LENGTH}" total_length="${stdout.length}">\n${tail}</truncated_output>\n`,
                  ].join("\n\n");
                })();
              }

              let stderrOrMessage = stderr;
              if (stderr.length > OUTPUT_MAX_LENGTH) {
                const filePath = await writeTmpFile(
                  stderr,
                  `exec_command-${command.replaceAll("/", "-").replaceAll(".", "dot-")}`,
                  "txt",
                );
                const lineCount = stderr.split("\n").length;
                stderrOrMessage = (() => {
                  const head = stderr.slice(0, OUTPUT_TRUNCATED_LENGTH);
                  const tail = stderr.slice(
                    Math.max(stderr.length - OUTPUT_TRUNCATED_LENGTH, 0),
                  );
                  return [
                    `Content is large (${stderr.length} characters, ${lineCount} lines) and saved to ${filePath}`,
                    `<truncated_output part="start" length="${OUTPUT_TRUNCATED_LENGTH}" total_length="${stderr.length}">\n${head}\n</truncated_output>`,
                    `<truncated_output part="end" length="${OUTPUT_TRUNCATED_LENGTH}" total_length="${stderr.length}">\n${tail}</truncated_output>\n`,
                  ].join("\n\n");
                })();
              }

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
