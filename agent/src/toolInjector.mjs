/**
 * Tool Injector Module
 *
 * Manages tool implementation injection.
 */

/**
 * @typedef {import("./tool.d.ts").Tool} Tool
 */

/**
 * Injector function that transforms a tool by injecting its implementation.
 *
 * @callback InjectorFunction
 * @param {Tool} tool - The tool to inject implementation into
 * @param {any} context - Context containing dependencies (subagentManager, state, etc.)
 * @returns {Tool} Tool with injected implementation
 */

/**
 * Tool Injector interface
 *
 * @typedef {Object} ToolInjector
 * @property {(toolName: string, injectorFn: InjectorFunction) => void} register - Register an injector for a specific tool
 * @property {(tools: Tool[], context: Object) => Tool[]} inject - Inject implementations into tools
 */

/**
 * Create a tool injector.
 *
 * @returns {ToolInjector} Tool injector instance
 *
 * @example
 * const toolInjector = createToolInjector();
 *
 * // Register injectors
 * toolInjector.register('delegate_to_subagent', (tool, context) => ({
 *   ...tool,
 *   impl: async (input) => { ... }
 * }));
 *
 * // Inject implementations
 * const injectedTools = toolInjector.inject(tools, { subagentManager, state });
 */
export function createToolInjector() {
  /** @type {Map<string, InjectorFunction>} */
  const injectors = new Map();

  return {
    /**
     * Register an injector function for a specific tool.
     *
     * @param {string} toolName - Name of the tool to inject implementation for
     * @param {InjectorFunction} injectorFn - Function that injects implementation
     */
    register(toolName, injectorFn) {
      injectors.set(toolName, injectorFn);
    },

    /**
     * Inject implementations into tools.
     *
     * For each tool, if an injector is registered for that tool name,
     * the injector function is called to transform the tool.
     * Otherwise, the tool is returned as-is.
     *
     * @param {Tool[]} tools - Array of tools to inject implementations into
     * @param {any} context - Context object containing dependencies
     * @returns {Tool[]} Array of tools with injected implementations
     */
    inject(tools, context) {
      return tools.map((tool) => {
        const injector = injectors.get(tool.def.name);
        return injector ? injector(tool, context) : tool;
      });
    },
  };
}
