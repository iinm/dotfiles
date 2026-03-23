/**
 * @typedef {Object} CliArgs
 * @property {string|null} model - Model name with variant
 * @property {boolean} showHelp - Whether to show help message
 */

/**
 * Parse command-line arguments.
 * @param {string[]} argv - process.argv or similar
 * @returns {CliArgs}
 */
export function parseCliArgs(argv) {
  const args = argv.slice(2);
  /** @type {CliArgs} */
  const result = { model: null, showHelp: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-m" && args[i + 1]) {
      result.model = args[++i];
    } else if (args[i] === "-h" || args[i] === "--help") {
      result.showHelp = true;
    }
  }

  return result;
}

/**
 * Print help message and exit.
 * @param {number} [exitCode] - Exit code (default: 0)
 */
export function printHelp(exitCode = 0) {
  console.log(`
Usage: agent [options]

Options:
  -m <model+variant>  Model to use
  -h, --help          Show this help message

Examples:
  agent -m claude-sonnet-4-6+thinking-16k
  agent -m gpt-5.4+thinking-medium
`);
  process.exit(exitCode);
}
