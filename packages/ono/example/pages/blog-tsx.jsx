/**
 * Blog index page using Hybrid TSX approach
 *
 * This demonstrates importing posts from auto-generated barrel file.
 * After running `ono dev`, you can use the barrel file (content/blog-tsx/index.ts).
 */
import * as firstPost from "../content/blog-tsx/2024-01-15-first-post.tsx";
import * as secondPost from "../content/blog-tsx/2024-02-20-second-post.tsx";

const posts = [
  { meta: firstPost.meta, Content: firstPost.default },
  { meta: secondPost.meta, Content: secondPost.default },
];

export default function BlogIndex() {
  // Sort posts by date (newest first)
  const sortedPosts = [...posts].sort(
    (a, b) => b.meta.date.getTime() - a.meta.date.getTime()
  );

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Blog (TSX Hybrid)</title>
        <link rel="stylesheet" href="/uno.css" />
      </head>
      <body class="max-w-800px mx-auto p-8">
        <header class="mb-8">
          <h1 class="text-3xl font-bold mb-2">Blog (TSX Hybrid)</h1>
          <p class="text-gray-600">
            Using the Hybrid approach: TypeScript metadata + Markdown content
          </p>
          <a href="/" class="text-blue-600 hover:underline">
            &larr; Back to home
          </a>
        </header>

        <main>
          {sortedPosts.map(({ meta }) => (
            <article key={meta.slug} class="mb-8 p-6 border rounded-lg">
              <h2 class="text-2xl font-bold mb-2">
                <a
                  href={`/blog-tsx/${meta.slug}.html`}
                  class="text-blue-600 hover:underline"
                >
                  {meta.title}
                </a>
              </h2>
              <div class="text-gray-600 mb-3">
                <time>{meta.date.toLocaleDateString()}</time>
                {" · "}
                {meta.author}
              </div>
              <div class="flex gap-2">
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </main>
      </body>
    </html>
  );
}
