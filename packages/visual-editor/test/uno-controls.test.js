import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUPS, classList, readValue, writeValue, parseColor, colorClass } from '../src/uno-controls.js';

const find = (label, group) =>
  GROUPS.find((g) => g.title === group).controls.find((c) => c.label === label);

test('scale controls distinguish p / px / py', () => {
  const classes = classList('px-4 py-2 p-1');
  assert.equal(readValue(find('padding', 'Spacing'), classes), 'p-1');
  assert.equal(readValue(find('padding x', 'Spacing'), classes), 'px-4');
  assert.equal(readValue(find('padding y', 'Spacing'), classes), 'py-2');
});

test('writeValue replaces in place, appends, and clears', () => {
  const p = find('padding', 'Spacing');
  assert.deepEqual(writeValue(p, ['flex', 'p-4', 'gap-2'], 'p-8'), ['flex', 'p-8', 'gap-2']);
  assert.deepEqual(writeValue(p, ['flex'], 'p-8'), ['flex', 'p-8']);
  assert.deepEqual(writeValue(p, ['flex', 'p-4'], ''), ['flex']);
  assert.deepEqual(writeValue(p, ['p-2', 'p-4'], 'p-8'), ['p-8'], 'duplicates collapse');
});

test('text size, align and color are separate slots', () => {
  const classes = classList('text-xl text-center text-emerald-600 sm:text-2xl');
  assert.equal(readValue(find('size', 'Typography'), classes), 'text-xl');
  assert.equal(readValue(find('align', 'Typography'), classes), 'text-center');
  assert.equal(readValue(find('color', 'Typography'), classes), 'text-emerald-600');
  // variants are never touched
  assert.deepEqual(writeValue(find('size', 'Typography'), classes, 'text-lg'), [
    'text-lg', 'text-center', 'text-emerald-600', 'sm:text-2xl',
  ]);
});

test('color parsing and building', () => {
  const c = find('background', 'Background & Border');
  assert.deepEqual(parseColor(c, 'bg-slate-50'), { hue: 'slate', shade: '50' });
  assert.deepEqual(parseColor(c, 'bg-white'), { hue: 'white', shade: '' });
  assert.equal(parseColor(c, 'bg-gradient-to-r'), null);
  assert.equal(colorClass('bg', 'white', '300'), 'bg-white');
  assert.equal(colorClass('bg', 'rose', ''), 'bg-rose-500');
  assert.equal(colorClass('text', 'rose', '700'), 'text-rose-700');
});

test('border color does not swallow border width', () => {
  const classes = classList('border border-2 border-slate-200');
  assert.equal(readValue(find('border', 'Background & Border'), classes), 'border');
  assert.equal(readValue(find('border color', 'Background & Border'), classes), 'border-slate-200');
});
