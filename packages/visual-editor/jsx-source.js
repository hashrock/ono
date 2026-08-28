/**
 * JSX source model for the visual editor.
 *
 * Uses sucrase's tokenizer (the same parser Ono compiles with) to find
 * every JSX element in a file, then performs text-level edits on the
 * original source so formatting is preserved.
 *
 * An element looks like:
 *   { index, tag, start, end, nameEnd, openEnd, selfClosing, host,
 *     attrs: [{ name, start, end, valueStart, valueEnd, value }],
 *     children: [{ type: 'element', element } | { type: 'text', start, end } | { type: 'expr', start, end }],
 *     parent }
 */
import { parse } from 'sucrase/dist/parser/index.js';
import { TokenType as tt } from 'sucrase/dist/parser/tokenizer/types.js';

export const ID_ATTR = 'data-ono-id';
/** Attribute names that carry the class list; `class` is preferred when adding. */
export const CLASS_ATTRS = ['class', 'className'];

/**
 * Parse a file and return its JSX elements in source order.
 * @param {string} source
 * @param {string} [filename]
 */
export function parseElements(source, filename = 'index.jsx') {
  // same extension rule as transformsFor() in ono/src/transformer.js (not imported: it would pull all of sucrase into the main bundle)
  const { tokens } = parse(source, true, /\.tsx?$/.test(filename), false);
  const elements = [];
  /** @type {any[]} */
  const stack = [];
  let i = 0;

  const top = () => stack[stack.length - 1];

  while (i < tokens.length) {
    const tok = tokens[i];
    const frame = top();

    if (tok.type === tt.jsxTagStart) {
      const next = tokens[i + 1];
      if (next && next.type === tt.slash) {
        // closing tag: </name> or </>
        let j = i + 2;
        while (tokens[j] && tokens[j].type !== tt.jsxTagEnd) j++;
        const closing = stack.pop();
        if (closing) {
          closing.element.closeStart = tok.start;
          closing.element.end = tokens[j].end;
        }
        i = j + 1;
        continue;
      }

      // opening tag: read name (may be a.b.c or empty for fragments)
      let j = i + 1;
      let tag = '';
      let nameEnd = tok.end;
      while (
        tokens[j] &&
        (tokens[j].type === tt.jsxName || tokens[j].type === tt.dot) &&
        tokens[j].start === nameEnd // contiguous: `a.b`, not the first attribute
      ) {
        tag += source.slice(tokens[j].start, tokens[j].end);
        nameEnd = tokens[j].end;
        j++;
      }
      const element = {
        index: elements.length,
        tag,
        start: tok.start,
        end: -1,
        nameEnd,
        openEnd: -1,
        closeStart: -1,
        selfClosing: false,
        host: /^[a-z]/.test(tag),
        attrs: [],
        children: [],
        parent: frame ? frame.element : null,
      };
      elements.push(element);
      if (frame) frame.element.children.push({ type: 'element', element });
      stack.push({ element, phase: 'open', depth: 0, exprStart: -1 });
      i = j;
      continue;
    }

    if (!frame) {
      i++;
      continue;
    }

    const el = frame.element;

    // Inside a `{...}` expression (attribute value, spread, or child):
    // only track nesting until the matching brace closes it.
    if (frame.depth > 0) {
      if (tok.type === tt.braceL) frame.depth++;
      else if (tok.type === tt.braceR && --frame.depth === 0) {
        if (frame.attr) {
          frame.attr.valueEnd = tok.end;
          frame.attr.end = tok.end;
          frame.attr = null;
        } else if (frame.phase === 'children') {
          el.children.push({ type: 'expr', start: frame.exprStart, end: tok.end });
        }
      }
      i++;
      continue;
    }

    if (frame.phase === 'open') {
      if (tok.type === tt.jsxName) {
        const attr = {
          name: source.slice(tok.start, tok.end),
          start: tok.start,
          end: tok.end,
          valueStart: -1,
          valueEnd: -1,
          value: null,
        };
        el.attrs.push(attr);
        const eq = tokens[i + 1];
        if (eq && eq.type === tt.eq) {
          const val = tokens[i + 2];
          if (val.type === tt.string) {
            attr.valueStart = val.start;
            attr.valueEnd = val.end;
            attr.end = val.end;
            attr.value = source.slice(val.start + 1, val.end - 1);
            i += 3;
            continue;
          }
          if (val.type === tt.braceL) {
            attr.valueStart = val.start;
            frame.attr = attr;
            frame.depth = 1;
            i += 3;
            continue;
          }
        }
        i++;
        continue;
      }
      if (tok.type === tt.braceL) {
        // spread attribute {...props}
        frame.depth = 1;
        i++;
        continue;
      }
      if (tok.type === tt.slash) {
        el.selfClosing = true;
        i++;
        continue;
      }
      if (tok.type === tt.jsxTagEnd) {
        el.openEnd = tok.end;
        if (el.selfClosing) {
          el.end = tok.end;
          stack.pop();
        } else {
          frame.phase = 'children';
        }
        i++;
        continue;
      }
      i++;
      continue;
    }

    // children phase
    if (tok.type === tt.jsxText) {
      el.children.push({ type: 'text', start: tok.start, end: tok.end });
    } else if (tok.type === tt.braceL) {
      frame.depth = 1;
      frame.exprStart = tok.start;
    }
    i++;
  }

  return elements;
}

/**
 * Insert `data-ono-id="<file>#<index>"` into every host element so the
 * rendered DOM can be mapped back to the source.
 * @param {string} source
 * @param {string} filename
 */
export function instrument(source, filename) {
  const parts = [];
  let prev = 0;
  for (const el of parseElements(source, filename)) {
    if (!el.host) continue;
    parts.push(source.slice(prev, el.nameEnd), ` ${ID_ATTR}="${filename}#${el.index}"`);
    prev = el.nameEnd;
  }
  parts.push(source.slice(prev));
  return parts.join('');
}

/** @param {string} id */
export function splitId(id) {
  const at = id.lastIndexOf('#');
  return { filename: id.slice(0, at), index: Number(id.slice(at + 1)) };
}

/** @param {string} source @param {number} pos */
function indentAt(source, pos) {
  const lineStart = source.lastIndexOf('\n', pos - 1) + 1;
  return source.slice(lineStart).match(/^[ \t]*/)[0];
}

/** @param {string} value */
function quote(value) {
  return `"${value.replace(/"/g, '&quot;')}"`;
}

/**
 * The single text child of an element, `null` when the element is
 * self-closing or has other children, `undefined` when it is empty.
 * @param {any} el
 */
function soleTextChild(el) {
  if (el.selfClosing) return null;
  if (el.children.length === 0) return undefined;
  const [child] = el.children;
  return el.children.length === 1 && child.type === 'text' ? child : null;
}

/**
 * Text content when the element holds only text, `null` otherwise.
 * @param {string} source
 * @param {any} el
 */
export function getText(source, el) {
  const child = soleTextChild(el);
  if (child === null) return null;
  return child ? source.slice(child.start, child.end).trim() : '';
}

/**
 * @param {string} source
 * @param {any} el
 * @param {string} text
 */
export function setText(source, el, text) {
  const child = soleTextChild(el);
  if (child === null) return source;
  if (child === undefined) return source.slice(0, el.openEnd) + text + source.slice(el.closeStart);
  const raw = source.slice(child.start, child.end);
  const lead = raw.match(/^\s*/)[0];
  const trail = raw.match(/\s*$/)[0];
  return source.slice(0, child.start) + lead + text + trail + source.slice(child.end);
}

/**
 * @param {any} el
 * @param {string[]} names
 */
export function findAttr(el, names) {
  return el.attrs.find((a) => names.includes(a.name)) || null;
}

/**
 * Set (or remove, when value is empty) a string attribute, matched by exact name.
 * @param {string} source
 * @param {any} el
 * @param {string} name
 * @param {string} value
 */
export function setAttr(source, el, name, value) {
  const attr = findAttr(el, [name]);
  if (attr) {
    if (value === '') {
      // remove the attribute and one preceding whitespace run
      let from = attr.start;
      while (from > el.nameEnd && /\s/.test(source[from - 1])) from--;
      return source.slice(0, from) + source.slice(attr.end);
    }
    if (attr.valueStart === -1) {
      return source.slice(0, attr.end) + '=' + quote(value) + source.slice(attr.end);
    }
    return source.slice(0, attr.valueStart) + quote(value) + source.slice(attr.valueEnd);
  }
  if (value === '') return source;
  return source.slice(0, el.nameEnd) + ` ${name}=${quote(value)}` + source.slice(el.nameEnd);
}

/**
 * @param {string} source
 * @param {any} el
 */
export function removeElement(source, el) {
  const [from, to] = removalRange(source, el);
  return source.slice(0, from) + source.slice(to);
}

/**
 * Range to cut when removing an element: the element itself, extended to
 * its whole line when it sits alone on it.
 * @param {string} source
 * @param {any} el
 * @returns {[number, number]}
 */
function removalRange(source, el) {
  const lineStart = source.lastIndexOf('\n', el.start - 1) + 1;
  const nextNewline = source.indexOf('\n', el.end);
  const lineEnd = nextNewline === -1 ? source.length : nextNewline;
  if (/^[ \t]*$/.test(source.slice(lineStart, el.start)) && /^[ \t]*$/.test(source.slice(el.end, lineEnd))) {
    return [Math.max(0, lineStart - 1), lineEnd];
  }
  return [el.start, el.end];
}

/** True when `el` is `ancestor` or nested inside it. */
export function isWithin(el, ancestor) {
  for (let node = el; node; node = node.parent) if (node === ancestor) return true;
  return false;
}

/**
 * Move an element so it sits right before or after another element of the
 * same file. Returns the new source and the moved element's new start offset.
 * @param {string} source
 * @param {any} el
 * @param {any} target
 * @param {'before' | 'after'} position
 */
export function moveElementTo(source, el, target, position) {
  if (el === target || isWithin(target, el)) return { source, start: el.start };
  const chunk = source.slice(el.start, el.end);
  const [cutFrom, cutTo] = removalRange(source, el);
  const indent = indentAt(source, target.start);
  let at = position === 'before' ? target.start : target.end;
  if (at >= cutTo) at -= cutTo - cutFrom;
  const without = source.slice(0, cutFrom) + source.slice(cutTo);
  const insert = position === 'before' ? `${chunk}\n${indent}` : `\n${indent}${chunk}`;
  const start = position === 'before' ? at : at + 1 + indent.length;
  return { source: without.slice(0, at) + insert + without.slice(at), start };
}

/**
 * Insert a snippet right after an element, on its own line.
 * @param {string} source
 * @param {any} el
 * @param {string} snippet
 */
export function insertAfter(source, el, snippet) {
  return insertSnippet(source, el, snippet, 'after').source;
}

/**
 * Insert a snippet on its own line before or after an element, matching its
 * indentation. Returns the new source and the snippet's start offset.
 * @param {string} source
 * @param {any} el
 * @param {string} snippet
 * @param {'before' | 'after'} position
 */
export function insertSnippet(source, el, snippet, position) {
  const indent = indentAt(source, el.start);
  if (position === 'before') {
    return { source: source.slice(0, el.start) + snippet + '\n' + indent + source.slice(el.start), start: el.start };
  }
  return { source: source.slice(0, el.end) + '\n' + indent + snippet + source.slice(el.end), start: el.end + 1 + indent.length };
}

/**
 * Append a snippet as the last child of an element.
 * @param {string} source
 * @param {any} el
 * @param {string} snippet
 */
export function appendChild(source, el, snippet) {
  if (el.selfClosing) return insertAfter(source, el, snippet);
  const indent = indentAt(source, el.start);
  const inner = source.slice(el.openEnd, el.closeStart);
  if (!inner.includes('\n')) {
    // inline element: keep everything on one line
    return source.slice(0, el.closeStart) + snippet + source.slice(el.closeStart);
  }
  const before = inner.replace(/\s+$/, '');
  return (
    source.slice(0, el.openEnd) +
    before +
    '\n' +
    indent +
    '  ' +
    snippet +
    '\n' +
    indent +
    source.slice(el.closeStart)
  );
}

export function duplicateElement(source, el) {
  return insertAfter(source, el, source.slice(el.start, el.end));
}

