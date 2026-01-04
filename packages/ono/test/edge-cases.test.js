import { describe, it } from "node:test";
import assert from "node:assert";
import { createElement } from "../src/jsx-runtime.js";
import { renderToString } from "../src/renderer.js";
import { transformJSX } from "../src/transformer.js";

describe("Edge Cases", () => {
  describe("renderToString", () => {
    it("should handle deeply nested elements", () => {
      const deep = createElement(
        "div",
        null,
        createElement(
          "div",
          null,
          createElement("div", null, createElement("div", null, "deep"))
        )
      );
      const result = renderToString(deep);
      assert.strictEqual(
        result,
        "<div><div><div><div>deep</div></div></div></div>"
      );
    });

    it("should handle special characters in text", () => {
      const vnode = createElement("div", null, "日本語テスト 🎉");
      const result = renderToString(vnode);
      assert.ok(result.includes("日本語テスト"));
      assert.ok(result.includes("🎉"));
    });

    it("should handle mixed children types", () => {
      const vnode = createElement(
        "div",
        null,
        "text",
        42,
        null,
        undefined,
        false,
        createElement("span", null, "child")
      );
      const result = renderToString(vnode);
      assert.ok(result.includes("text"));
      assert.ok(result.includes("42"));
      assert.ok(result.includes("<span>child</span>"));
    });

    it("should handle attribute with special characters", () => {
      const vnode = createElement("div", { title: "Hello & <Test>" });
      const result = renderToString(vnode);
      assert.ok(result.includes("&amp;"));
      assert.ok(result.includes("&lt;"));
    });

    it("should handle empty style object", () => {
      const vnode = createElement("div", { style: {} });
      const result = renderToString(vnode);
      // Empty style object creates style="" attribute
      assert.ok(result.includes("<div"));
    });
  });

  describe("transformJSX", () => {
    it("should handle JSX with template literals", () => {
      const input = "const elem = <div>{`Hello ${name}`}</div>;";
      const result = transformJSX(input);
      assert.ok(result.includes("name"));
    });

    it("should handle fragment-like syntax", () => {
      const input = "const elem = <><div /><span /></>;";
      const result = transformJSX(input);
      assert.ok(typeof result === "string");
    });

    it("should handle spread props", () => {
      const input = "const elem = <div {...props}>content</div>;";
      const result = transformJSX(input);
      assert.ok(result.includes("props"));
    });
  });
});
