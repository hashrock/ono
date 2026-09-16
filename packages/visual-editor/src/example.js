/** Entry point of the example project. */
export const EXAMPLE_ENTRY = 'index.jsx';

/**
 * Sample project shown when <VisualEditor> is used without `files`.
 * @type {Record<string, string>}
 */
export const EXAMPLE_FILES = {
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
          <p class="mt-2 text-emerald-100">Every action rewrites the JSX — see it in the Code tab.</p>
          <button class="mt-4 rounded-md bg-white px-4 py-2 font-medium text-emerald-700">Get started</button>
        </section>
      </main>
    </div>
  );
}
`,
};
