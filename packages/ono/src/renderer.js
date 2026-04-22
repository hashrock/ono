/**
 * Renderer - Convert VNodes to HTML strings
 */
import { SELF_CLOSING_TAGS } from "./constants.js";
import { Fragment } from "./jsx-runtime.js";

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

function camelToKebab(str) {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function styleToString(style) {
  if (typeof style === 'string') {
    return style;
  }

  return Object.entries(style)
    .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
    .join('; ');
}

function renderAttributes(props) {
  if (!props) return '';

  const attributes = [];

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'dangerouslySetInnerHTML') continue;

    if (key === 'className') {
      attributes.push(`class="${escapeHtml(value)}"`);
      continue;
    }

    if (key === 'style') {
      attributes.push(`style="${escapeHtml(styleToString(value))}"`);
      continue;
    }

    if (typeof value === 'boolean') {
      if (value) attributes.push(key);
      continue;
    }

    if (value != null) {
      attributes.push(`${key}="${escapeHtml(value)}"`);
    }
  }

  return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
}

function renderChildren(children) {
  return children && children.length > 0
    ? children.map(renderToString).join('')
    : '';
}

export function renderToString(vnode) {
  if (vnode == null || typeof vnode === 'boolean') {
    return '';
  }

  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return escapeHtml(vnode);
  }

  const { tag, props, children } = vnode;

  if (tag === Fragment) {
    return renderChildren(children);
  }

  if (typeof tag === 'function') {
    const componentProps = { ...props };
    if (children && children.length > 0) {
      componentProps.children = children;
    }
    return renderToString(tag(componentProps));
  }

  const attrs = renderAttributes(props);

  if (SELF_CLOSING_TAGS.has(tag)) {
    return `<${tag}${attrs} />`;
  }

  if (props?.dangerouslySetInnerHTML?.__html) {
    return `<${tag}${attrs}>${props.dangerouslySetInnerHTML.__html}</${tag}>`;
  }

  return `<${tag}${attrs}>${renderChildren(children)}</${tag}>`;
}
