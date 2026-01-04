import { describe, it } from "node:test";
import assert from "node:assert";
import { createElement } from "../src/jsx-runtime.js";
import { renderToString } from "../src/renderer.js";
import { transformJSX } from "../src/transformer.js";

describe("Error Handling", () => {
  describe("renderToString", () => {
    it("should handle null input", () => {
      const result = renderToString(null);
      assert.strictEqual(result, "");
    });

    it("should handle undefined input", () => {
      const result = renderToString(undefined);
      assert.strictEqual(result, "");
    });

    it("should handle array children", () => {
      const vnode = createElement("ul", null, [
        createElement("li", null, "item1"),
        createElement("li", null, "item2"),
      ]);
      const result = renderToString(vnode);
      assert.ok(result.includes("<li>item1</li>"));
    });

    it("should handle false/true boolean", () => {
      assert.strictEqual(renderToString(false), "");
      assert.strictEqual(renderToString(true), "");
    });
  });

  describe("createElement", () => {
    it("should handle missing props", () => {
      const vnode = createElement("div", null, "text");
      assert.ok(vnode, "should create element without props");
    });

    it("should handle empty children array", () => {
      const vnode = createElement("div", null, ...[]);
      const result = renderToString(vnode);
      assert.strictEqual(result, "<div></div>");
    });
  });

  describe("transformJSX", () => {
    it("should handle plain JS without JSX", () => {
      const result = transformJSX("const x = 5;");
      assert.ok(result.includes("const x = 5"), "should preserve plain JS");
    });

    it("should handle incomplete JSX", () => {
      // TypeScript auto-closes incomplete JSX
      const result = transformJSX("const x = <div");
      assert.ok(typeof result === "string", "should return string");
    });
  });
});
