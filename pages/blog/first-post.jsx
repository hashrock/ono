export default function FirstPost() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>First Post - Blog</title>
        <style>{`
          body {
            font-family: system-ui, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
          }
          nav {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #eee;
          }
          nav a {
            margin-right: 1rem;
            color: #0070f3;
            text-decoration: none;
          }
          nav a:hover {
            text-decoration: underline;
          }
          article {
            margin-top: 2rem;
          }
          .meta {
            color: #666;
            font-size: 0.9rem;
          }
        `}</style>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about.html">About</a>
          <a href="/blog/first-post.html">Blog</a>
        </nav>
        <article>
          <h1>My First Blog Post</h1>
          <p class="meta">Published on October 29, 2025</p>
          <p>Welcome to my first blog post built with Mini JSX!</p>
          <p>This page is in a subdirectory (<code>pages/blog/</code>), and the output preserves the directory structure (<code>dist/blog/first-post.html</code>).</p>
          <h2>Why Mini JSX?</h2>
          <p>Mini JSX makes it easy to build static sites with JSX components, without the complexity of a full framework.</p>
        </article>
      </body>
    </html>
  );
}
