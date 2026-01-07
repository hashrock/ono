import { test } from "node:test";
import assert from "node:assert";
import { createElement, Fragment } from "../src/jsx-runtime.js";

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

test("Fragment - is a symbol", () => {
  assert.strictEqual(typeof Fragment, "symbol");
  assert.strictEqual(Fragment.description, "ono.fragment");
});

test("createElement - Fragment with children", () => {
  const child1 = createElement("div", null, "Item 1");
  const child2 = createElement("div", null, "Item 2");
  const result = createElement(Fragment, null, child1, child2);

  assert.strictEqual(result.tag, Fragment);
  assert.deepStrictEqual(result.props, {});
  assert.strictEqual(result.children.length, 2);
  assert.deepStrictEqual(result.children[0], {
    tag: "div",
    props: {},
    children: ["Item 1"]
  });
  assert.deepStrictEqual(result.children[1], {
    tag: "div",
    props: {},
    children: ["Item 2"]
  });
});

test("createElement - Fragment with no children", () => {
  const result = createElement(Fragment);

  assert.strictEqual(result.tag, Fragment);
  assert.deepStrictEqual(result.props, {});
  assert.deepStrictEqual(result.children, []);
});

test("createElement - Fragment with text children", () => {
  const result = createElement(Fragment, null, "Hello", " ", "World");

  assert.strictEqual(result.tag, Fragment);
  assert.deepStrictEqual(result.children, ["Hello", " ", "World"]);
});
