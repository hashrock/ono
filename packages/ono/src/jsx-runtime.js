/**
 * JSX Runtime - createElement function
 * Creates a VNode (Virtual Node) from JSX
 *
 * This module is self-contained (no imports) so the builder can inject it
 * verbatim into compiled pages as the single source of truth for the runtime.
 * It must stay browser-compatible for the REPL.
 */

/**
 * Fragment symbol for grouping elements without a wrapper.
 * Symbol.for keeps identity stable even if the runtime is evaluated twice.
 */
export const Fragment = Symbol.for("ono.fragment");

/**
 * Flatten array recursively and filter out null/undefined/boolean children
 * @param {any[]} children - Array of children to flatten
 * @returns {any[]} Flattened array
 */
function flattenChildren(children) {
  const result = [];

  for (const child of children) {
    if (child === null || child === undefined || typeof child === "boolean") {
      continue;
    }

    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child);
    }
  }

  return result;
}

/**
 * Create a VNode
 * @param {string|Function} tag - HTML tag name or component function
 * @param {Object} props - Element properties/attributes
 * @param {...any} children - Child elements
 * @returns {Object} VNode object
 */
export function createElement(tag, props, ...children) {
  return {
    tag,
    props: props || {},
    children: flattenChildren(children)
  };
}

/**
 * JSX runtime function (react-jsx transform)
 * @param {string|Function} tag - HTML tag name or component function
 * @param {Object} props - Element properties/attributes (includes children)
 * @returns {Object} VNode object
 */
export function jsx(tag, props) {
  const { children, ...restProps } = props || {};
  const childrenArray = children !== undefined ? (Array.isArray(children) ? children : [children]) : [];
  return {
    tag,
    props: restProps,
    children: flattenChildren(childrenArray)
  };
}

// jsxs is the same as jsx (for elements with multiple children)
export const jsxs = jsx;

// Alias for compatibility
export const h = createElement;
