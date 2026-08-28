import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reducer, elementsOf } from '../src/editor.js';

const files = {
  'index.jsx': `export default function App() {
  return (
    <div class="p-4">
      <h1 class="title">Hello</h1>
      <p>Body</p>
    </div>
  );
}
`,
};
const t = (index) => ({ filename: 'index.jsx', index });
const start = () => reducer(initialState(files, 'index.jsx'), { type: 'select', selection: { id: 'index.jsx#1', nth: 0 } });

test('setAttr keeps the selection and records history', () => {
  const s = reducer(start(), { type: 'setAttr', target: t(1), name: 'class', value: 'big' });
  assert.match(s.files['index.jsx'], /<h1 class="big">/);
  assert.deepEqual(s.selection, { id: 'index.jsx#1', nth: 0 });
  assert.equal(s.past.length, 1);
  assert.equal(s.compile, 'now');
});

test('a no-op edit leaves state untouched', () => {
  const s0 = start();
  const s = reducer(s0, { type: 'setText', target: t(0), text: 'x' }); // div has element children
  assert.equal(s, s0);
});

test('remove clears the selection', () => {
  const s = reducer(start(), { type: 'remove', target: t(1) });
  assert.ok(!s.files['index.jsx'].includes('<h1'));
  assert.equal(s.selection, null);
});

test('move and insert select the element at its new place', () => {
  let s = reducer(start(), { type: 'move', target: t(2), to: t(1), position: 'before', nth: 0 });
  assert.match(s.files['index.jsx'], /<p>Body<\/p>\n      <h1/);
  assert.equal(elementsOf('index.jsx', s.files['index.jsx'])[s.selection.id.split('#')[1]].tag, 'p');

  s = reducer(s, { type: 'insert', target: t(1), position: 'after', code: '<hr />' });
  const el = elementsOf('index.jsx', s.files['index.jsx'])[Number(s.selection.id.split('#')[1])];
  assert.equal(el.tag, 'hr');
});

test('undo / redo walk the history; typing clears redo', () => {
  const s0 = start();
  const s1 = reducer(s0, { type: 'setText', target: t(1), text: 'Hi' });
  const s2 = reducer(s1, { type: 'duplicate', target: t(2) });
  const u1 = reducer(s2, { type: 'undo' });
  assert.equal(u1.files['index.jsx'], s1.files['index.jsx']);
  const u0 = reducer(u1, { type: 'undo' });
  assert.equal(u0.files['index.jsx'], files['index.jsx']);
  assert.equal(reducer(u0, { type: 'undo' }), u0, 'nothing left to undo');
  const r1 = reducer(u0, { type: 'redo' });
  assert.equal(r1.files['index.jsx'], s1.files['index.jsx']);
  assert.equal(r1.selection.id, 'index.jsx#1');
  const typed = reducer(r1, { type: 'setSource', filename: 'index.jsx', source: '' });
  assert.equal(typed.future.length, 0);
  assert.equal(typed.compile, 'soon');
});
