import { test } from "node:test";
import assert from "node:assert";
import { createElement, Fragment } from "../src/jsx-runtime.js";
import { renderToString } from "../src/renderer.js";

test("renderToString - simple text", () => {
  const result = renderToString("Hello");
  assert.strictEqual(result, "Hello");
});

test("renderToString - simple element", () => {
  const vnode = createElement("div");
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div></div>");
});

test("renderToString - element with text child", () => {
  const vnode = createElement("div", null, "Hello");
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div>Hello</div>");
});

test("renderToString - element with multiple children", () => {
  const vnode = createElement("div", null, "Hello", " ", "World");
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div>Hello World</div>");
});

test("renderToString - nested elements", () => {
  const vnode = createElement("div", null,
    createElement("span", null, "child")
  );
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div><span>child</span></div>");
});

test("renderToString - self-closing tags", () => {
  const vnode = createElement("img", { src: "test.jpg" });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<img src="test.jpg" />');
});

test("renderToString - multiple self-closing tags", () => {
  const br = createElement("br");
  const hr = createElement("hr");
  const input = createElement("input", { type: "text" });

  assert.strictEqual(renderToString(br), "<br />");
  assert.strictEqual(renderToString(hr), "<hr />");
  assert.strictEqual(renderToString(input), '<input type="text" />');
});

test("renderToString - attributes", () => {
  const vnode = createElement("div", { id: "test", className: "container" });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<div id="test" class="container"></div>');
});

test("renderToString - className to class conversion", () => {
  const vnode = createElement("div", { className: "foo bar" });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<div class="foo bar"></div>');
});

test("renderToString - style object", () => {
  const vnode = createElement("div", {
    style: { color: "red", fontSize: "16px" }
  });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<div style="color: red; font-size: 16px"></div>');
});

test("renderToString - style object with camelCase", () => {
  const vnode = createElement("div", {
    style: { backgroundColor: "blue", marginTop: "10px" }
  });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<div style="background-color: blue; margin-top: 10px"></div>');
});

test("renderToString - boolean attributes", () => {
  const vnode = createElement("input", { disabled: true, checked: false });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<input disabled />');
});

test("renderToString - escape HTML in text", () => {
  const vnode = createElement("div", null, "<script>alert('xss')</script>");
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div>&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;</div>");
});

test("renderToString - escape HTML in attributes", () => {
  const vnode = createElement("div", { title: '<script>' });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<div title="&lt;script&gt;"></div>');
});

test("renderToString - component function", () => {
  function Greeting(props) {
    return createElement("div", null, "Hello, ", props.name);
  }

  const vnode = createElement(Greeting, { name: "World" });
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div>Hello, World</div>");
});

test("renderToString - component with children prop", () => {
  function Card(props) {
    return createElement("div", { className: "card" }, props.children);
  }

  const vnode = createElement(Card, null,
    createElement("h1", null, "Title"),
    createElement("p", null, "Content")
  );
  const result = renderToString(vnode);
  assert.strictEqual(result, '<div class="card"><h1>Title</h1><p>Content</p></div>');
});

test("renderToString - nested components", () => {
  function Inner(props) {
    return createElement("span", null, props.text);
  }

  function Outer(props) {
    return createElement("div", null, createElement(Inner, { text: props.message }));
  }

  const vnode = createElement(Outer, { message: "Hello" });
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div><span>Hello</span></div>");
});

test("renderToString - number children", () => {
  const vnode = createElement("div", null, 42, " ", 3.14);
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div>42 3.14</div>");
});

test("renderToString - empty string children", () => {
  const vnode = createElement("div", null, "");
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div></div>");
});

test("renderToString - data attributes", () => {
  const vnode = createElement("div", { "data-id": "123", "data-name": "test" });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<div data-id="123" data-name="test"></div>');
});

test("renderToString - aria attributes", () => {
  const vnode = createElement("button", { "aria-label": "Close", "aria-hidden": "true" });
  const result = renderToString(vnode);
  assert.strictEqual(result, '<button aria-label="Close" aria-hidden="true"></button>');
});

test("renderToString - Fragment with multiple elements", () => {
  const vnode = createElement(Fragment, null,
    createElement("div", null, "Item 1"),
    createElement("div", null, "Item 2")
  );
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div>Item 1</div><div>Item 2</div>");
});

test("renderToString - Fragment with text children", () => {
  const vnode = createElement(Fragment, null, "Hello", " ", "World");
  const result = renderToString(vnode);
  assert.strictEqual(result, "Hello World");
});

test("renderToString - empty Fragment", () => {
  const vnode = createElement(Fragment);
  const result = renderToString(vnode);
  assert.strictEqual(result, "");
});

test("renderToString - nested Fragment", () => {
  const vnode = createElement("div", null,
    createElement(Fragment, null,
      createElement("span", null, "A"),
      createElement("span", null, "B")
    )
  );
  const result = renderToString(vnode);
  assert.strictEqual(result, "<div><span>A</span><span>B</span></div>");
});

test("renderToString - Fragment inside component", () => {
  function List() {
    return createElement(Fragment, null,
      createElement("li", null, "Item 1"),
      createElement("li", null, "Item 2"),
      createElement("li", null, "Item 3")
    );
  }

  const vnode = createElement("ul", null, createElement(List));
  const result = renderToString(vnode);
  assert.strictEqual(result, "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>");
});

test("renderToString - Fragment with mixed content", () => {
  const vnode = createElement(Fragment, null,
    "Text before",
    createElement("strong", null, "bold"),
    "Text after"
  );
  const result = renderToString(vnode);
  assert.strictEqual(result, "Text before<strong>bold</strong>Text after");
});
