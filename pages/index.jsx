export default function Home() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Home - Mini JSX Pages Example</title>
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
          <h1 class="text-4xl font-bold mb-4">Welcome to Mini JSX</h1>
          <p class="mb-4 text-lg">This is a multi-page static site built with Mini JSX!</p>
          <ul class="list-disc ml-6 space-y-2">
            <li>Pages are automatically discovered from the <code class="bg-gray-100 px-2 py-1 rounded text-sm">pages/</code> directory</li>
            <li>Directory structure is preserved in the output</li>
            <li>Live reload works across all pages</li>
            <li class="text-green-600 font-semibold">Now with UnoCSS atomic CSS!</li>
          </ul>
        </main>
      </body>
    </html>
  );
}
