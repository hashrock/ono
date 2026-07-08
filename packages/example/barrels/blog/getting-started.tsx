export const meta = {
  title: "Getting Started with Ono",
  date: "2025-01-03",
  author: "hashrock",
  tags: ["tutorial", "ono"],
};

export default function GettingStarted() {
  return (
    <article>
      <h1>{meta.title}</h1>
      <p class="text-gray-500">{meta.date} by {meta.author}</p>
      <div class="flex gap-2 mb-4">
        {meta.tags.map((tag) => (
          <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">{tag}</span>
        ))}
      </div>
      <h2>Installation</h2>
      <pre><code>npm install @hashrock/ono</code></pre>
      <h2>Usage</h2>
      <p>Create a pages directory and add JSX files.</p>
    </article>
  );
}
