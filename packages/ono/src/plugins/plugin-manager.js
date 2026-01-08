/**
 * Plugin Manager - Handles plugin lifecycle and execution
 */

/**
 * Plugin lifecycle hooks
 */
export const PLUGIN_HOOKS = {
  COLLECT_DEPENDENCIES: 'collectDependencies',
  BEFORE_TRANSFORM: 'beforeTransform',
  TRANSFORM: 'transform',
  AFTER_TRANSFORM: 'afterTransform',
  BEFORE_BUNDLE: 'beforeBundle',
  AFTER_BUNDLE: 'afterBundle'
};

/**
 * Plugin Manager class
 */
export class PluginManager {
  constructor(plugins = []) {
    this.plugins = plugins;
    this.context = {};
  }

  /**
   * Execute a hook across all plugins
   * @param {string} hookName - Name of the hook to execute
   * @param {any} data - Data to pass to the hook
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Result after all plugins have processed
   */
  async executeHook(hookName, data, options = {}) {
    let result = data;

    for (const plugin of this.plugins) {
      if (plugin.hooks && typeof plugin.hooks[hookName] === 'function') {
        try {
          const hookResult = await plugin.hooks[hookName](result, {
            ...this.context,
            ...options
          });

          // If hook returns a value, use it for next plugin
          if (hookResult !== undefined) {
            result = hookResult;
          }
        } catch (error) {
          console.error(`Error in plugin "${plugin.name}" hook "${hookName}":`, error);
          throw error;
        }
      }
    }

    return result;
  }

  /**
   * Execute a hook and collect results from all plugins
   * @param {string} hookName - Name of the hook to execute
   * @param {any} data - Data to pass to the hook
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of results from all plugins
   */
  async collectHookResults(hookName, data, options = {}) {
    const results = [];

    for (const plugin of this.plugins) {
      if (plugin.hooks && typeof plugin.hooks[hookName] === 'function') {
        try {
          const hookResult = await plugin.hooks[hookName](data, {
            ...this.context,
            ...options
          });

          if (hookResult !== undefined && hookResult !== null) {
            results.push(hookResult);
          }
        } catch (error) {
          console.error(`Error in plugin "${plugin.name}" hook "${hookName}":`, error);
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Set context data that will be passed to all plugins
   * @param {Object} context - Context data
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get plugin by name
   * @param {string} name - Plugin name
   * @returns {Object|null} Plugin or null if not found
   */
  getPlugin(name) {
    return this.plugins.find(p => p.name === name) || null;
  }
}

/**
 * Create a plugin manager with default plugins
 * @param {Array} plugins - Array of plugins
 * @returns {PluginManager}
 */
export function createPluginManager(plugins = []) {
  return new PluginManager(plugins);
}
