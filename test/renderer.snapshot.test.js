/**
 * Snapshot tests for HTML renderer
 */
import { test } from "node:test";
import { createElement } from "../src/jsx-runtime.js";
import { renderToString } from "../src/renderer.js";
import { matchHTMLSnapshot } from "./snapshot-utils.js";

const TEST_FILE = "renderer.snapshot.test.js";

test("snapshot - simple element", async () => {
  const vnode = createElement("div");
  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "simple element");
});

test("snapshot - element with text", async () => {
  const vnode = createElement("div", null, "Hello World");
  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "element with text");
});

test("snapshot - element with attributes", async () => {
  const vnode = createElement("div", {
    className: "container",
    id: "main",
    "data-testid": "test-element"
  });
  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "element with attributes");
});

test("snapshot - nested elements", async () => {
  const vnode = createElement("div", { className: "container" },
    createElement("h1", null, "Title"),
    createElement("p", null, "This is a paragraph with ",
      createElement("strong", null, "bold text"),
      " and regular text."
    ),
    createElement("ul", null,
      createElement("li", null, "Item 1"),
      createElement("li", null, "Item 2"),
      createElement("li", null, "Item 3")
    )
  );
  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "nested elements");
});

test("snapshot - component function", async () => {
  function BlogPost({ title, author, children }) {
    return createElement("article", { className: "blog-post" },
      createElement("header", null,
        createElement("h1", null, title),
        createElement("p", { className: "author" }, "By ", author)
      ),
      createElement("div", { className: "content" }, children)
    );
  }

  const vnode = BlogPost({
    title: "My First Post",
    author: "John Doe",
    children: [
      createElement("p", null, "This is the first paragraph."),
      createElement("p", null, "This is the second paragraph.")
    ]
  });

  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "component function");
});

test("snapshot - boolean attributes", async () => {
  const vnode = createElement("input", {
    type: "checkbox",
    checked: true,
    disabled: false,
    required: true
  });
  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "boolean attributes");
});

test("snapshot - style object", async () => {
  const vnode = createElement("div", {
    style: {
      backgroundColor: "red",
      fontSize: "16px",
      margin: "10px 20px"
    }
  }, "Styled content");
  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "style object");
});

test("snapshot - complex form", async () => {
  const vnode = createElement("form", { className: "contact-form", method: "post" },
    createElement("div", { className: "form-group" },
      createElement("label", { htmlFor: "name" }, "Name:"),
      createElement("input", {
        type: "text",
        id: "name",
        name: "name",
        required: true,
        placeholder: "Enter your name"
      })
    ),
    createElement("div", { className: "form-group" },
      createElement("label", { htmlFor: "email" }, "Email:"),
      createElement("input", {
        type: "email",
        id: "email",
        name: "email",
        required: true,
        placeholder: "Enter your email"
      })
    ),
    createElement("div", { className: "form-group" },
      createElement("label", { htmlFor: "message" }, "Message:"),
      createElement("textarea", {
        id: "message",
        name: "message",
        rows: 4,
        placeholder: "Enter your message"
      })
    ),
    createElement("button", { type: "submit", className: "btn btn-primary" }, "Send Message")
  );
  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "complex form");
});

test("snapshot - HTML entities escaping", async () => {
  const vnode = createElement("div", {
    title: "This has \"quotes\" & <tags>",
    "data-value": "<script>alert('xss')</script>"
  },
    "Content with <em>HTML</em> & \"special\" characters"
  );
  const result = renderToString(vnode);
  await matchHTMLSnapshot(result, TEST_FILE, "HTML entities escaping");
});