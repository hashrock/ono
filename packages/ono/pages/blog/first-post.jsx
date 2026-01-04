export default function FirstPost() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>First Post - Blog</title>
        <link rel="stylesheet" href="/uno.css" />
        <link rel="stylesheet" href="/css/style.css" />
      </head>
      <body class="font-sans max-w-800px mx-auto px-8 py-8 leading-relaxed">
        <nav class="mb-8 pb-4 border-b-2 border-gray-200">
          <a href="/" class="mr-4 text-primary no-underline hover:underline">Home</a>
          <a href="/about.html" class="mr-4 text-primary no-underline hover:underline">About</a>
          <a href="/blog/first-post.html" class="mr-4 text-primary no-underline hover:underline">Blog</a>
        </nav>
        <article class="mt-8">
          <h1 class="text-4xl font-bold mb-2">My First Blog Post</h1>
          <p class="text-secondary text-sm mb-6">Published on October 29, 2025</p>
          <p class="mb-4 text-lg">Welcome to my first blog post built with Mini JSX!</p>
          <p class="mb-4">This page is in a subdirectory (<code class="bg-gray-100 px-2 py-1 rounded text-sm">pages/blog/</code>), and the output preserves the directory structure (<code class="bg-gray-100 px-2 py-1 rounded text-sm">dist/blog/first-post.html</code>).</p>
          <h2 class="text-2xl font-semibold mb-3 mt-6">Why Mini JSX?</h2>
          <p class="mb-4">Mini JSX makes it easy to build static sites with JSX components, without the complexity of a full framework.</p>
        </article>
      </body>
    </html>
  );
}
