import { test } from "node:test";
import assert from "node:assert";
import { createPluginManager, PLUGIN_HOOKS } from "../src/plugins/plugin-manager.js";

test("createPluginManager - creates manager with empty plugins", () => {
  const manager = createPluginManager();
  assert.ok(manager);
  assert.strictEqual(manager.plugins.length, 0);
});

test("createPluginManager - creates manager with plugins", () => {
  const plugins = [
    { name: 'test-plugin', hooks: {} }
  ];
  const manager = createPluginManager(plugins);
  assert.strictEqual(manager.plugins.length, 1);
  assert.strictEqual(manager.plugins[0].name, 'test-plugin');
});

test("executeHook - executes hook on single plugin", async () => {
  let executed = false;
  const plugin = {
    name: 'test',
    hooks: {
      testHook: async (data) => {
        executed = true;
        return data;
      }
    }
  };

  const manager = createPluginManager([plugin]);
  await manager.executeHook('testHook', {});
  assert.ok(executed);
});

test("executeHook - passes data through plugins", async () => {
  const plugin1 = {
    name: 'plugin1',
    hooks: {
      transform: async (data) => {
        return data + ' plugin1';
      }
    }
  };

  const plugin2 = {
    name: 'plugin2',
    hooks: {
      transform: async (data) => {
        return data + ' plugin2';
      }
    }
  };

  const manager = createPluginManager([plugin1, plugin2]);
  const result = await manager.executeHook('transform', 'start');
  assert.strictEqual(result, 'start plugin1 plugin2');
});

test("executeHook - handles plugins without hook", async () => {
  const plugin1 = {
    name: 'plugin1',
    hooks: {
      otherHook: async () => {}
    }
  };

  const plugin2 = {
    name: 'plugin2',
    hooks: {
      testHook: async (data) => {
        return data + ' modified';
      }
    }
  };

  const manager = createPluginManager([plugin1, plugin2]);
  const result = await manager.executeHook('testHook', 'data');
  assert.strictEqual(result, 'data modified');
});

test("executeHook - returns original data if no plugins modify", async () => {
  const plugin = {
    name: 'test',
    hooks: {
      testHook: async (data) => {
        // Don't return anything
      }
    }
  };

  const manager = createPluginManager([plugin]);
  const result = await manager.executeHook('testHook', { value: 42 });
  assert.deepStrictEqual(result, { value: 42 });
});

test("executeHook - passes context to plugins", async () => {
  let receivedContext = null;
  const plugin = {
    name: 'test',
    hooks: {
      testHook: async (data, context) => {
        receivedContext = context;
        return data;
      }
    }
  };

  const manager = createPluginManager([plugin]);
  manager.setContext({ key: 'value' });
  await manager.executeHook('testHook', {});

  assert.ok(receivedContext);
  assert.strictEqual(receivedContext.key, 'value');
});

test("executeHook - passes options to plugins", async () => {
  let receivedOptions = null;
  const plugin = {
    name: 'test',
    hooks: {
      testHook: async (data, context) => {
        receivedOptions = context;
        return data;
      }
    }
  };

  const manager = createPluginManager([plugin]);
  await manager.executeHook('testHook', {}, { custom: 'option' });

  assert.ok(receivedOptions);
  assert.strictEqual(receivedOptions.custom, 'option');
});

test("collectHookResults - collects results from all plugins", async () => {
  const plugin1 = {
    name: 'plugin1',
    hooks: {
      collect: async () => 'result1'
    }
  };

  const plugin2 = {
    name: 'plugin2',
    hooks: {
      collect: async () => 'result2'
    }
  };

  const manager = createPluginManager([plugin1, plugin2]);
  const results = await manager.collectHookResults('collect', {});

  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0], 'result1');
  assert.strictEqual(results[1], 'result2');
});

test("collectHookResults - excludes undefined results", async () => {
  const plugin1 = {
    name: 'plugin1',
    hooks: {
      collect: async () => 'result1'
    }
  };

  const plugin2 = {
    name: 'plugin2',
    hooks: {
      collect: async () => undefined
    }
  };

  const plugin3 = {
    name: 'plugin3',
    hooks: {
      collect: async () => 'result3'
    }
  };

  const manager = createPluginManager([plugin1, plugin2, plugin3]);
  const results = await manager.collectHookResults('collect', {});

  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0], 'result1');
  assert.strictEqual(results[1], 'result3');
});

test("getPlugin - finds plugin by name", () => {
  const plugins = [
    { name: 'plugin1', hooks: {} },
    { name: 'plugin2', hooks: {} }
  ];

  const manager = createPluginManager(plugins);
  const plugin = manager.getPlugin('plugin2');

  assert.ok(plugin);
  assert.strictEqual(plugin.name, 'plugin2');
});

test("getPlugin - returns null for non-existent plugin", () => {
  const manager = createPluginManager([]);
  const plugin = manager.getPlugin('nonexistent');

  assert.strictEqual(plugin, null);
});

test("PLUGIN_HOOKS - exports hook constants", () => {
  assert.ok(PLUGIN_HOOKS);
  assert.strictEqual(typeof PLUGIN_HOOKS.COLLECT_DEPENDENCIES, 'string');
  assert.strictEqual(typeof PLUGIN_HOOKS.BEFORE_TRANSFORM, 'string');
  assert.strictEqual(typeof PLUGIN_HOOKS.TRANSFORM, 'string');
  assert.strictEqual(typeof PLUGIN_HOOKS.AFTER_TRANSFORM, 'string');
  assert.strictEqual(typeof PLUGIN_HOOKS.BEFORE_BUNDLE, 'string');
  assert.strictEqual(typeof PLUGIN_HOOKS.AFTER_BUNDLE, 'string');
});
