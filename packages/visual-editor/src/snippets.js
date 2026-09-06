/**
 * Default insert palette. `icon` is just a glyph for the palette tile,
 * `code` is the JSX inserted before / after the drop target.
 * Pass your own list to <VisualEditor snippets={...} />.
 * @typedef {{ label: string, icon: string, code: string }} Snippet
 * @type {Snippet[]}
 */
export const DEFAULT_SNIPPETS = [
  { label: 'Heading', icon: 'H', code: '<h2 class="text-xl font-semibold">Heading</h2>' },
  { label: 'Paragraph', icon: '¶', code: '<p class="text-slate-600">Paragraph text</p>' },
  { label: 'Button', icon: '⏺', code: '<button class="rounded-md bg-emerald-600 px-4 py-2 text-white">Button</button>' },
  { label: 'Link', icon: '⛓', code: '<a href="#" class="text-emerald-600 underline">Link</a>' },
  { label: 'Box', icon: '▢', code: '<div class="rounded-lg border border-slate-200 p-4">Box</div>' },
  { label: 'Row', icon: '⇔', code: '<div class="flex items-center gap-4"><span>One</span><span>Two</span></div>' },
  { label: 'Image', icon: '🖼', code: '<img class="rounded-lg" src="https://picsum.photos/400/200" alt="" />' },
  { label: 'List', icon: '≡', code: '<ul class="list-disc list-inside space-y-1"><li>First</li><li>Second</li></ul>' },
  { label: 'Input', icon: '⌨', code: '<input class="rounded-md border border-slate-300 px-3 py-2" placeholder="Type here" />' },
  { label: 'Divider', icon: '—', code: '<hr class="my-4 border-slate-200" />' },
];
