import { test } from "node:test";
import assert from "node:assert";
import { createElement } from "../src/jsx-runtime.js";

test("createElement - simple element without props", () => {
  const result = createElement("div");

  assert.deepStrictEqual(result, {
    tag: "div",
    props: {},
    children: []
  });
});

test("createElement - element with text child", () => {
  const result = createElement("div", null, "Hello");

  assert.deepStrictEqual(result, {
    tag: "div",
    props: {},
    children: ["Hello"]
  });
});

test("createElement - element with multiple children", () => {
  const result = createElement("div", null, "Hello", " ", "World");

  assert.deepStrictEqual(result, {
    tag: "div",
    props: {},
    children: ["Hello", " ", "World"]
  });
});

test("createElement - element with props", () => {
  const result = createElement("div", { id: "test", className: "container" });

  assert.deepStrictEqual(result, {
    tag: "div",
    props: { id: "test", className: "container" },
    children: []
  });
});

test("createElement - element with props and children", () => {
  const result = createElement("div", { id: "test" }, "Hello");

  assert.deepStrictEqual(result, {
    tag: "div",
    props: { id: "test" },
    children: ["Hello"]
  });
});

test("createElement - nested elements", () => {
  const child = createElement("span", null, "child");
  const result = createElement("div", null, child);

  assert.deepStrictEqual(result, {
    tag: "div",
    props: {},
    children: [
      {
        tag: "span",
        props: {},
        children: ["child"]
      }
    ]
  });
});

test("createElement - with style object", () => {
  const result = createElement("div", {
    style: { color: "red", fontSize: "16px" }
  });

  assert.deepStrictEqual(result, {
    tag: "div",
    props: {
      style: { color: "red", fontSize: "16px" }
    },
    children: []
  });
});

test("createElement - flatten nested array children", () => {
  const result = createElement("div", null, ["a", "b"], "c");

  assert.deepStrictEqual(result, {
    tag: "div",
    props: {},
    children: ["a", "b", "c"]
  });
});

test("createElement - filter out null and undefined children", () => {
  const result = createElement("div", null, "a", null, undefined, "b");

  assert.deepStrictEqual(result, {
    tag: "div",
    props: {},
    children: ["a", "b"]
  });
});

test("createElement - handle boolean children", () => {
  const result = createElement("div", null, true, false, "text");

  assert.deepStrictEqual(result, {
    tag: "div",
    props: {},
    children: ["text"]
  });
});

test("createElement - component function", () => {
  const result = createElement(() => {}, { name: "test" });

  assert.strictEqual(typeof result.tag, "function");
  assert.deepStrictEqual(result.props, { name: "test" });
});
