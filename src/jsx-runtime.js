/**
 * JSX Runtime - createElement function
 * Creates a VNode (Virtual Node) from JSX
 */

/**
 * Flatten array recursively and filter out falsy values
 */
function flattenChildren(children) {
  const result = [];

  for (const child of children) {
    if (child === null || child === undefined || typeof child === 'boolean') {
      // Skip null, undefined, and boolean values
      continue;
    }

    if (Array.isArray(child)) {
      // Recursively flatten arrays
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

// Alias for compatibility
export const h = createElement;
