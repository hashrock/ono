/**
 * Ono Blog Module - Hybrid Markdown + JSX support
 */
import { marked } from "marked";
import { createElement } from "./jsx-runtime.js";

/**
 * Markdown component - renders markdown string to HTML
 * @param {Object} props
 * @param {string} props.children - Markdown content
 * @returns {Object} VNode with rendered HTML
 *
 * @example
 * ```tsx
 * import { Markdown } from '@hashrock/ono/blog';
 *
 * export default () => (
 *   <Markdown>{`
 * # Hello World
 *
 * This is **bold** text.
 *   `}</Markdown>
 * );
 * ```
 */
export function Markdown({ children }) {
  const content = Array.isArray(children) ? children.join("") : children || "";
  const html = marked.parse(content.trim());

  return createElement("div", {
    class: "markdown-content",
    dangerouslySetInnerHTML: { __html: html },
  });
}

/**
 * Tagged template literal for markdown
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {Object} VNode with rendered HTML
 *
 * @example
 * ```tsx
 * import { md } from '@hashrock/ono/blog';
 *
 * export default md`
 * # Hello World
 *
 * This is **bold** text.
 * `;
 * ```
 */
export function md(strings, ...values) {
  const content = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] !== undefined ? String(values[i]) : "");
  }, "");

  const html = marked.parse(content.trim());

  return createElement("div", {
    class: "markdown-content",
    dangerouslySetInnerHTML: { __html: html },
  });
}

/**
 * Define a blog post with metadata and content
 * @param {Object} options
 * @param {string} options.title - Post title
 * @param {string|Date} options.date - Post date
 * @param {string} [options.author] - Post author
 * @param {string[]} [options.tags] - Post tags
 * @param {string} [options.slug] - Custom slug (defaults to filename)
 * @param {string} options.content - Markdown content
 * @returns {Object} Post object with meta and Content component
 *
 * @example
 * ```tsx
 * import { definePost } from '@hashrock/ono/blog';
 *
 * export default definePost({
 *   title: "My First Post",
 *   date: "2024-01-15",
 *   tags: ["javascript"],
 *   content: `
 * # Hello
 *
 * This is my post content.
 *   `,
 * });
 * ```
 */
export function definePost(options) {
  const { title, date, author, tags, slug, content, ...rest } = options;

  const meta = {
    title,
    date: date instanceof Date ? date : new Date(date),
    author,
    tags: tags || [],
    slug,
    ...rest,
  };

  const html = marked.parse((content || "").trim());

  function Content() {
    return createElement("div", {
      class: "markdown-content",
      dangerouslySetInnerHTML: { __html: html },
    });
  }

  return { meta, Content, html };
}

/**
 * Article wrapper component with semantic HTML
 * @param {Object} props
 * @param {any} props.children - Article content
 * @param {string} [props.class] - Additional CSS classes
 * @returns {Object} VNode
 */
export function Article({ children, class: className, ...props }) {
  return createElement("article", {
    class: className ? `prose ${className}` : "prose",
    ...props,
  }, children);
}

/**
 * Parse markdown string to HTML (utility function)
 * @param {string} content - Markdown content
 * @returns {string} HTML string
 */
export function parseMarkdown(content) {
  return marked.parse(content.trim());
}
