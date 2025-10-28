export default function About() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>About - Mini JSX Pages Example</title>
        <link rel="stylesheet" href="/uno.css" />
        <link rel="stylesheet" href="/css/style.css" />
      </head>
      <body class="font-sans max-w-800px mx-auto px-8 py-8 leading-relaxed">
        <nav class="mb-8 pb-4 border-b-2 border-gray-200">
          <a href="/" class="mr-4 text-primary no-underline hover:underline">Home</a>
          <a href="/about.html" class="mr-4 text-primary no-underline hover:underline">About</a>
          <a href="/blog/first-post.html" class="mr-4 text-primary no-underline hover:underline">Blog</a>
        </nav>
        <main>
          <h1 class="text-4xl font-bold mb-4">About Mini JSX</h1>
          <p class="mb-4 text-lg">Mini JSX is a lightweight JSX library for static site generation.</p>
          <h2 class="text-2xl font-semibold mb-3 mt-6">Features</h2>
          <ul class="list-disc ml-6 space-y-2">
            <li>Simple JSX runtime</li>
            <li>Fast bundler</li>
            <li>Pages directory support</li>
            <li>Live reload dev server</li>
            <li class="text-green-600 font-semibold">UnoCSS atomic CSS integration</li>
          </ul>
        </main>
      </body>
    </html>
  );
}
