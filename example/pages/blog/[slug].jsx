/** @jsxImportSource @hashrock/ono */
import { getCollection, getEntry } from "@hashrock/ono/content";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.slug },
  }));
}

export default async function BlogPost({ params }) {
  const post = await getEntry("blog", params.slug);

  if (!post) {
    return (
      <html>
        <head>
          <title>Post Not Found</title>
        </head>
        <body>
          <h1>404 - Post Not Found</h1>
        </body>
      </html>
    );
  }

  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{post.data.title} - Blog</title>
        <link rel="stylesheet" href="/uno.css" />
      </head>
      <body class="max-w-800px mx-auto p-8">
        <nav class="mb-8">
          <a href="/blog.html" class="text-blue-600 hover:underline">
            ← Back to Blog
          </a>
        </nav>

        <article>
          <header class="mb-8">
            <h1 class="text-4xl font-bold mb-4">{post.data.title}</h1>
            <div class="text-gray-600 mb-4">
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
              <div class="flex gap-2">
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
            class="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </article>

        <footer class="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>Built with Ono - Minimalist SSG Framework</p>
        </footer>
      </body>
    </html>
  );
}
