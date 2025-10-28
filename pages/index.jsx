export default function Home() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Home - Mini JSX Pages Example</title>
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
        `}</style>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about.html">About</a>
          <a href="/blog/first-post.html">Blog</a>
        </nav>
        <main>
          <h1>Welcome to Mini JSX</h1>
          <p>This is a multi-page static site built with Mini JSX!</p>
          <ul>
            <li>Pages are automatically discovered from the <code>pages/</code> directory</li>
            <li>Directory structure is preserved in the output</li>
            <li>Live reload works across all pages</li>
          </ul>
        </main>
      </body>
    </html>
  );
}
