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
