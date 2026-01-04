import { Markdown } from "@hashrock/ono/blog";

export const meta = {
  slug: "first-post",
  title: "My First Blog Post",
  date: new Date("2024-01-15"),
  author: "John Doe",
  tags: ["javascript", "web", "tutorial"],
};

export default function Content() {
  return (
    <>
      <Markdown>{`
# Welcome to My Blog

This is my first blog post using **Ono's Hybrid TSX approach**!

## Features

The Hybrid approach provides:

- Type-safe metadata with TypeScript
- Markdown content for easy writing
- Mix JSX components when needed
- Auto-generated barrel files for imports

## Code Example

Here's a simple example:

\`\`\`javascript
// In your page file, import from the barrel file:
// const { posts } = require('./content/blog-tsx');

// All posts are type-safe and auto-imported!
posts.map(({ meta, Content }) => (
  <article>
    <h1>{meta.title}</h1>
    <Content />
  </article>
));
\`\`\`
      `}</Markdown>

      <div class="bg-blue-100 p-4 rounded mt-4">
        <p class="font-bold">This is a JSX component!</p>
        <p>You can mix Markdown with custom JSX components.</p>
      </div>

      <Markdown>{`
## Conclusion

Building static sites with Ono is simple and type-safe!
      `}</Markdown>
    </>
  );
}
