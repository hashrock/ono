import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseElements,
  instrument,
  setAttr,
  setText,
  getText,
  removeElement,
  duplicateElement,
  appendChild,
  moveElementTo,
  insertSnippet,
  isWithin,
} from '../src/jsx-source.js';

const src = `export function App() {
  return (
    <div class="p-4">
      <h1 className="title">Hello</h1>
      <Card title={x}>
        <p>Body</p>
      </Card>
      <img src="a.png" />
    </div>
  );
}
`;

test('parseElements finds every element with ranges', () => {
  const els = parseElements(src);
  assert.deepEqual(
    els.map((e) => e.tag),
    ['div', 'h1', 'Card', 'p', 'img'],
  );
  const [div, h1, card, p, img] = els;
  assert.equal(src.slice(h1.start, h1.end), '<h1 className="title">Hello</h1>');
  assert.equal(src.slice(img.start, img.end), '<img src="a.png" />');
  assert.equal(img.selfClosing, true);
  assert.equal(card.host, false);
  assert.equal(p.parent, card);
  assert.equal(h1.parent, div);
  assert.equal(card.attrs[0].name, 'title');
  assert.equal(card.attrs[0].value, null);
  assert.equal(src.slice(card.attrs[0].valueStart, card.attrs[0].valueEnd), '{x}');
});

test('instrument adds data-ono-id to host elements only', () => {
  const out = instrument(src, 'index.jsx');
  assert.match(out, /<div data-ono-id="index.jsx#0" class="p-4">/);
  assert.match(out, /<h1 data-ono-id="index.jsx#1" className="title">/);
  assert.match(out, /<Card title=\{x\}>/);
  assert.match(out, /<img data-ono-id="index.jsx#4" src="a.png" \/>/);
});

test('setAttr replaces, adds and removes', () => {
  const els = parseElements(src);
  assert.match(setAttr(src, els[0], 'class', 'p-8'), /<div class="p-8">/);
  assert.match(setAttr(src, els[1], 'className', 'big'), /<h1 className="big">/);
  assert.match(setAttr(src, els[3], 'class', 'lead'), /<p class="lead">Body/);
  assert.match(setAttr(src, els[0], 'class', ''), /<div>/);
  assert.match(setAttr(src, els[2], 'title', 'T'), /<Card title="T">/);
});

test('getText / setText on single text child', () => {
  const els = parseElements(src);
  assert.equal(getText(src, els[1]), 'Hello');
  assert.equal(getText(src, els[0]), null);
  assert.equal(getText(src, els[4]), null);
  assert.match(setText(src, els[1], 'Hi'), /<h1 className="title">Hi<\/h1>/);
});

test('removeElement drops the whole line', () => {
  const els = parseElements(src);
  const out = removeElement(src, els[1]);
  assert.ok(!out.includes('<h1'));
  assert.match(out, /<div class="p-4">\n      <Card/);
});

test('duplicateElement keeps indentation', () => {
  const els = parseElements(src);
  const out = duplicateElement(src, els[3]);
  assert.match(out, /        <p>Body<\/p>\n        <p>Body<\/p>\n/);
});

test('appendChild adds a child before the closing tag', () => {
  const els = parseElements(src);
  const out = appendChild(src, els[2], '<p>More</p>');
  assert.match(out, /<p>Body<\/p>\n        <p>More<\/p>\n      <\/Card>/);
  const inline = appendChild(src, els[1], '<b>!</b>');
  assert.match(inline, /Hello<b>!<\/b><\/h1>/);
});

test('moveElementTo moves before / after another element', () => {
  const els = parseElements(src);
  const [div, h1, card, p, img] = els;
  const up = moveElementTo(src, img, h1, 'before');
  assert.match(up.source, /<div class="p-4">\n      <img src="a.png" \/>\n      <h1/);
  assert.equal(up.source.slice(up.start, up.start + 4), '<img');
  const down = moveElementTo(src, h1, card, 'after');
  assert.match(down.source, /<\/Card>\n      <h1 className="title">Hello<\/h1>\n      <img/);
  assert.equal(down.source.slice(down.start, down.start + 3), '<h1');
  // into a deeper level picks up the target's indentation
  const inner = moveElementTo(src, img, p, 'after');
  assert.match(inner.source, /<p>Body<\/p>\n        <img src="a.png" \/>\n      <\/Card>/);
  // no-ops: onto itself, or into its own descendant
  assert.equal(moveElementTo(src, div, p, 'before').source, src);
  assert.ok(isWithin(p, card) && !isWithin(card, p));
});

test('insertSnippet before / after on its own line', () => {
  const els = parseElements(src);
  const before = insertSnippet(src, els[1], '<hr />', 'before');
  assert.match(before.source, /<div class="p-4">\n      <hr \/>\n      <h1/);
  assert.equal(before.source.slice(before.start, before.start + 6), '<hr />');
  const after = insertSnippet(src, els[3], '<hr />', 'after');
  assert.match(after.source, /<p>Body<\/p>\n        <hr \/>\n      <\/Card>/);
  assert.equal(after.source.slice(after.start, after.start + 6), '<hr />');
});
