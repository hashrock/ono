/** @jsxImportSource @hashrock/ono */
import { getCollection } from "@hashrock/ono/content";

export default async function BlogIndex() {
  const posts = await getCollection("blog", (post) => !post.data.draft);

  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Blog - Ono Content Collections Example</title>
        <link rel="stylesheet" href="/uno.css" />
      </head>
      <body class="max-w-800px mx-auto p-8">
        <header class="mb-8">
          <h1 class="text-4xl font-bold text-blue-600 mb-2">Blog</h1>
          <p class="text-gray-600">
            Powered by Ono Content Collections
          </p>
        </header>

        <main>
          {posts.map((post) => (
            <article key={post.slug} class="mb-12 pb-8 border-b border-gray-200">
              <header class="mb-4">
                <h2 class="text-2xl font-bold mb-2">
                  <a href={`/blog/${post.slug}.html`} class="text-gray-900 hover:text-blue-600">
                    {post.data.title}
                  </a>
                </h2>
                <div class="text-sm text-gray-600">
                  <time datetime={post.data.date.toISOString()}>
                    {post.data.date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  {" · "}
                  <span>{post.data.author}</span>
                </div>
                {post.data.tags && post.data.tags.length > 0 && (
                  <div class="mt-2 flex gap-2">
                    {post.data.tags.map((tag) => (
                      <span
                        key={tag}
                        class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </header>
              <div
                class="prose prose-sm"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
            </article>
          ))}
        </main>

        <footer class="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>Built with Ono - Minimalist SSG Framework</p>
        </footer>
      </body>
    </html>
  );
}
