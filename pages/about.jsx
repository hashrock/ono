export default function About() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>About - Mini JSX Pages Example</title>
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
          <h1>About Mini JSX</h1>
          <p>Mini JSX is a lightweight JSX library for static site generation.</p>
          <h2>Features</h2>
          <ul>
            <li>Simple JSX runtime</li>
            <li>Fast bundler</li>
            <li>Pages directory support</li>
            <li>Live reload dev server</li>
          </ul>
        </main>
      </body>
    </html>
  );
}
