export const ENTRY = 'index.jsx';

export const example = {
  'components/Card.jsx': `export function Card(props) {
  return (
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">{props.title}</h2>
      <div class="mt-2 text-sm text-slate-600">{props.children}</div>
    </div>
  );
}
`,
  'index.jsx': `import { Card } from './components/Card.jsx';

export default function App() {
  return (
    <div class="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header class="border-b border-slate-200 bg-white px-8 py-6">
        <h1 class="text-3xl font-bold text-emerald-600">Hello, Ono!</h1>
        <p class="mt-1 text-slate-500">Click any element to edit it.</p>
      </header>
      <main class="grid gap-6 p-8 sm:grid-cols-2">
        <Card title="Edit classes">
          <p>Change UnoCSS classes in the inspector and the preview updates.</p>
        </Card>
        <Card title="Edit text">
          <p>Text-only elements can be rewritten directly.</p>
        </Card>
        <section class="rounded-xl bg-emerald-600 p-6 text-white sm:col-span-2">
          <h2 class="text-xl font-semibold">Insert, duplicate, move, delete</h2>
          <p class="mt-2 text-emerald-100">Every action rewrites the JSX on the left.</p>
          <button class="mt-4 rounded-md bg-white px-4 py-2 font-medium text-emerald-700">Get started</button>
        </section>
      </main>
    </div>
  );
}
`,
};

/** Insert palette. `icon` is just a glyph for the palette tile. */
export const snippets = [
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
