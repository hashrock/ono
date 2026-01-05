/**
 * Renderer - Convert VNodes to HTML strings
 */
import { SELF_CLOSING_TAGS } from "./constants.js";

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Convert camelCase to kebab-case
 */
function camelToKebab(str) {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Convert style object to CSS string
 */
function styleToString(style) {
  if (typeof style === 'string') {
    return style;
  }

  return Object.entries(style)
    .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
    .join('; ');
}

/**
 * Render attributes to string
 */
function renderAttributes(props) {
  if (!props) return '';

  const attributes = [];

  for (const [key, value] of Object.entries(props)) {
    // Skip special props
    if (key === 'children' || key === 'dangerouslySetInnerHTML') continue;

    // Handle className -> class conversion
    if (key === 'className') {
      attributes.push(`class="${escapeHtml(value)}"`);
      continue;
    }

    // Handle style object
    if (key === 'style') {
      const styleStr = styleToString(value);
      attributes.push(`style="${escapeHtml(styleStr)}"`);
      continue;
    }

    // Handle boolean attributes
    if (typeof value === 'boolean') {
      if (value) {
        attributes.push(key);
      }
      continue;
    }

    // Handle regular attributes
    if (value != null) {
      attributes.push(`${key}="${escapeHtml(value)}"`);
    }
  }

  return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
}

/**
 * Render a VNode to HTML string
 */
export function renderToString(vnode) {
  // Handle primitive values
  if (vnode == null || typeof vnode === 'boolean') {
    return '';
  }

  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return escapeHtml(vnode);
  }

  // Handle VNode object
  const { tag, props, children } = vnode;

  // Handle component functions
  if (typeof tag === 'function') {
    // Pass props with children
    const componentProps = { ...props };
    if (children && children.length > 0) {
      componentProps.children = children;
    }

    // Call component function and render result
    const result = tag(componentProps);
    return renderToString(result);
  }

  // Handle HTML elements
  const attrs = renderAttributes(props);
  const isSelfClosing = SELF_CLOSING_TAGS.has(tag);

  if (isSelfClosing) {
    return `<${tag}${attrs} />`;
  }

  // Handle dangerouslySetInnerHTML
  if (props && props.dangerouslySetInnerHTML && props.dangerouslySetInnerHTML.__html) {
    return `<${tag}${attrs}>${props.dangerouslySetInnerHTML.__html}</${tag}>`;
  }

  // Render children
  const childrenHtml = children && children.length > 0
    ? children.map(child => renderToString(child)).join('')
    : '';

  return `<${tag}${attrs}>${childrenHtml}</${tag}>`;
}
