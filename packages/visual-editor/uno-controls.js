/**
 * GUI controls for common UnoCSS (Tailwind-style) utilities.
 *
 * A control owns one "slot" in the class list (e.g. padding-x, text color).
 * `readValue` finds the class currently filling that slot, `writeValue`
 * replaces it in place (or appends / removes). Classes the controls do not
 * understand — variants like `sm:` / `hover:`, arbitrary values — are left
 * untouched and shown as plain chips.
 */

export const SCALE = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'];

/** Tailwind palette hues with their 500 shade, used to tint the swatches. */
export const HUES = {
  slate: '#64748b', gray: '#6b7280', zinc: '#71717a', neutral: '#737373', stone: '#78716c',
  red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16',
  green: '#22c55e', emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9',
  blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef',
  pink: '#ec4899', rose: '#f43f5e',
};
export const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const PLAIN_COLORS = ['white', 'black', 'transparent'];

/** Approximate CSS color for a palette entry, for swatches only. */
export function swatchColor(hue, shade = '500') {
  if (hue === 'white') return '#fff';
  if (hue === 'black') return '#000';
  if (hue === 'transparent') return 'transparent';
  const base = HUES[hue];
  if (!base) return 'transparent';
  const n = Number(shade);
  if (n === 500) return base;
  const mixWith = n < 500 ? 'white' : 'black';
  const pct = n < 500 ? Math.round((500 - n) / 5) : Math.round((n - 500) / 5.5);
  return `color-mix(in oklab, ${base}, ${mixWith} ${pct}%)`;
}

/** @param {string} prefix @param {string[]} values */
const withPrefix = (prefix, values) => values.map((v) => `${prefix}-${v}`);

/**
 * @typedef {{ label: string, kind: 'select', options: string[], test?: RegExp }
 *         | { label: string, kind: 'color', prefix: string, test: RegExp }} Control
 */

/** @param {string} label @param {string} prefix — scale control like `p-4`, `mt-2` */
const scale = (label, prefix) => ({
  label,
  kind: 'select',
  options: withPrefix(prefix, SCALE),
  test: new RegExp(`^${prefix}-(\\d+(\\.\\d+)?|px)$`),
});

/** @param {string} label @param {string} prefix — color control like `text-red-500`, `bg-white` */
const color = (label, prefix) => ({
  label,
  kind: 'color',
  prefix,
  test: new RegExp(`^${prefix}-(?:(${Object.keys(HUES).join('|')})-(${SHADES.join('|')})|(${PLAIN_COLORS.join('|')}))$`),
});

/** @param {string} label @param {string[]} options */
const select = (label, options) => ({ label, kind: 'select', options });

/** @type {{ title: string, controls: Control[] }[]} */
export const GROUPS = [
  {
    title: 'Layout',
    controls: [
      select('display', ['block', 'inline-block', 'flex', 'inline-flex', 'grid', 'hidden']),
      select('direction', ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse']),
      select('align', withPrefix('items', ['start', 'center', 'end', 'stretch', 'baseline'])),
      select('justify', withPrefix('justify', ['start', 'center', 'end', 'between', 'around', 'evenly'])),
      select('columns', withPrefix('grid-cols', ['1', '2', '3', '4', '5', '6', '12'])),
      scale('gap', 'gap'),
    ],
  },
  {
    title: 'Spacing',
    controls: [
      scale('padding', 'p'),
      scale('padding x', 'px'),
      scale('padding y', 'py'),
      scale('margin', 'm'),
      scale('margin x', 'mx'),
      scale('margin y', 'my'),
      scale('margin top', 'mt'),
      scale('margin bottom', 'mb'),
    ],
  },
  {
    title: 'Size',
    controls: [
      select('width', withPrefix('w', ['auto', 'full', 'screen', 'fit', '1/2', '1/3', '2/3', '1/4', '3/4'])),
      select('height', withPrefix('h', ['auto', 'full', 'screen', 'fit'])),
      select('max width', withPrefix('max-w', ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'])),
      select('min height', withPrefix('min-h', ['0', 'full', 'screen'])),
    ],
  },
  {
    title: 'Typography',
    controls: [
      select('size', withPrefix('text', ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'])),
      select('weight', withPrefix('font', ['thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold'])),
      select('align', withPrefix('text', ['left', 'center', 'right', 'justify'])),
      select('leading', withPrefix('leading', ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'])),
      select('tracking', withPrefix('tracking', ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'])),
      select('transform', ['uppercase', 'lowercase', 'capitalize', 'normal-case']),
      select('decoration', ['underline', 'line-through', 'no-underline']),
      color('color', 'text'),
    ],
  },
  {
    title: 'Background & Border',
    controls: [
      color('background', 'bg'),
      select('radius', ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full']),
      select('border', ['border', 'border-0', 'border-2', 'border-4']),
      color('border color', 'border'),
      select('shadow', ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl']),
      select('opacity', withPrefix('opacity', ['0', '25', '50', '75', '100'])),
    ],
  },
];

/** @param {Control} control @param {string} cls */
function matches(control, cls) {
  return control.test ? control.test.test(cls) : control.options.includes(cls);
}

/** Split a class attribute value into a list. @param {string} value */
export function classList(value) {
  return value.split(/\s+/).filter(Boolean);
}

/**
 * Class currently filling the control's slot, or '' when unset.
 * @param {Control} control @param {string[]} classes
 */
export function readValue(control, classes) {
  return classes.find((cls) => matches(control, cls)) ?? '';
}

/**
 * Replace the control's slot with `value` ('' clears it), keeping the
 * position of the replaced class so the attribute stays readable.
 * @param {Control} control @param {string[]} classes @param {string} value
 */
export function writeValue(control, classes, value) {
  const next = [];
  let placed = false;
  for (const cls of classes) {
    if (!matches(control, cls)) {
      next.push(cls);
    } else if (!placed && value) {
      next.push(value);
      placed = true;
    }
  }
  if (value && !placed) next.push(value);
  return next;
}

/**
 * Parse a color class into { hue, shade } (shade is '' for white/black/transparent).
 * @param {Extract<Control, { kind: 'color' }>} control @param {string} cls
 */
export function parseColor(control, cls) {
  const m = cls && control.test.exec(cls);
  if (!m) return null;
  return m[3] ? { hue: m[3], shade: '' } : { hue: m[1], shade: m[2] };
}

/** @param {string} prefix @param {string} hue @param {string} shade */
export function colorClass(prefix, hue, shade) {
  return PLAIN_COLORS.includes(hue) ? `${prefix}-${hue}` : `${prefix}-${hue}-${shade || '500'}`;
}

export const COLOR_HUES = [...PLAIN_COLORS, ...Object.keys(HUES)];
