/**
 * Individual blog post page using Hybrid TSX approach
 */
import * as firstPost from "../../content/blog-tsx/2024-01-15-first-post.tsx";
import * as secondPost from "../../content/blog-tsx/2024-02-20-second-post.tsx";

const posts = [
  { meta: firstPost.meta, Content: firstPost.default },
  { meta: secondPost.meta, Content: secondPost.default },
];

export async function getStaticPaths() {
  return posts.map((post) => ({
    params: { slug: post.meta.slug },
  }));
}

export default function BlogPost({ params }) {
  const post = posts.find((p) => p.meta.slug === params.slug);

  if (!post) {
    return (
      <html lang="en">
        <head>
          <title>404 - Post Not Found</title>
        </head>
        <body>
          <h1>404 - Post Not Found</h1>
          <a href="/blog-tsx.html">Back to blog</a>
        </body>
      </html>
    );
  }

  const { meta, Content } = post;

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{meta.title}</title>
        <link rel="stylesheet" href="/uno.css" />
      </head>
      <body class="max-w-800px mx-auto p-8">
        <header class="mb-8">
          <a href="/blog-tsx.html" class="text-blue-600 hover:underline">
            &larr; Back to blog
          </a>
        </header>

        <article>
          <header class="mb-8 pb-4 border-b">
            <h1 class="text-4xl font-bold mb-4">{meta.title}</h1>
            <div class="text-gray-600 mb-4">
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
          </header>

          <div class="prose">
            <Content />
          </div>
        </article>

        <footer class="mt-12 pt-4 border-t text-gray-500">
          <p>
            Built with <a href="https://github.com/hashrock/ono" class="text-blue-600">Ono</a> using the Hybrid approach.
          </p>
        </footer>
      </body>
    </html>
  );
}
