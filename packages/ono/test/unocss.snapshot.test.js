/**
 * Snapshot tests for UnoCSS generation
 */
import { test } from "node:test";
import { generateCSS } from "../src/unocss.js";
import { matchCodeSnapshot } from "./snapshot-utils.js";

const TEST_FILE = "unocss.snapshot.test.js";

test("snapshot - basic utility classes", async () => {
  const htmlContent = `
    <div class="text-red-500 bg-blue-100 p-4 m-2">
      <h1 class="text-2xl font-bold">Title</h1>
      <p class="text-gray-600">Content</p>
    </div>
  `;

  const css = await generateCSS(htmlContent);
  await matchCodeSnapshot(css, TEST_FILE, "basic utility classes");
});

test("snapshot - layout classes", async () => {
  const htmlContent = `
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center">
        <div class="w-1/2">Left</div>
        <div class="w-1/2">Right</div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2">Main</div>
        <div>Sidebar</div>
      </div>
    </div>
  `;

  const css = await generateCSS(htmlContent);
  await matchCodeSnapshot(css, TEST_FILE, "layout classes");
});

test("snapshot - responsive design", async () => {
  const htmlContent = `
    <div class="block md:hidden lg:flex">
      <div class="w-full md:w-1/2 lg:w-1/3">
        <h1 class="text-xl md:text-2xl lg:text-3xl">Responsive Title</h1>
        <p class="text-sm md:text-base lg:text-lg">Responsive content</p>
      </div>
    </div>
  `;

  const css = await generateCSS(htmlContent);
  await matchCodeSnapshot(css, TEST_FILE, "responsive design");
});

test("snapshot - color utilities", async () => {
  const htmlContent = `
    <div class="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
      <div class="text-white bg-black bg-opacity-50">
        <h1 class="text-yellow-300">Colorful Title</h1>
        <p class="text-green-200">Green text</p>
        <button class="bg-blue-500 hover:bg-blue-700 text-white">Button</button>
      </div>
    </div>
  `;

  const css = await generateCSS(htmlContent);
  await matchCodeSnapshot(css, TEST_FILE, "color utilities");
});

test("snapshot - spacing and sizing", async () => {
  const htmlContent = `
    <div class="p-8 m-4 space-y-6">
      <div class="h-32 w-64 border-2 border-gray-300 rounded-lg">
        <div class="p-2 m-1">
          <span class="px-3 py-1 text-xs">Tag</span>
        </div>
      </div>
      <div class="min-h-screen max-w-4xl">Large content</div>
    </div>
  `;

  const css = await generateCSS(htmlContent);
  await matchCodeSnapshot(css, TEST_FILE, "spacing and sizing");
});

test("snapshot - typography", async () => {
  const htmlContent = `
    <article class="prose prose-lg max-w-none">
      <h1 class="font-bold text-4xl leading-tight">Main Title</h1>
      <h2 class="font-semibold text-2xl">Subtitle</h2>
      <p class="text-base leading-relaxed font-normal">
        This is a paragraph with <strong class="font-bold">bold text</strong>
        and <em class="italic">italic text</em>.
      </p>
      <blockquote class="border-l-4 border-gray-300 pl-4 italic">
        A wise quote here.
      </blockquote>
      <code class="font-mono text-sm bg-gray-100 px-1 rounded">inline code</code>
    </article>
  `;

  const css = await generateCSS(htmlContent);
  await matchCodeSnapshot(css, TEST_FILE, "typography");
});

test("snapshot - form elements", async () => {
  const htmlContent = `
    <form class="space-y-4 max-w-md">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        class="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
      >
        Submit
      </button>
    </form>
  `;

  const css = await generateCSS(htmlContent);
  await matchCodeSnapshot(css, TEST_FILE, "form elements");
});

test("snapshot - blog layout", async () => {
  const htmlContent = `
    <div class="max-w-4xl mx-auto px-4 py-8">
      <header class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">Blog Title</h1>
        <p class="text-gray-600">Powered by Ono</p>
      </header>

      <main class="space-y-8">
        <article class="bg-white rounded-lg shadow-md p-6">
          <header class="mb-4">
            <h2 class="text-2xl font-bold mb-2">
              <a href="#" class="text-gray-900 hover:text-blue-600">Post Title</a>
            </h2>
            <div class="text-sm text-gray-600">
              <time>January 15, 2024</time>
              <span class="mx-2">·</span>
              <span>John Doe</span>
            </div>
            <div class="mt-2 flex gap-2">
              <span class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">JavaScript</span>
              <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Web</span>
            </div>
          </header>
          <div class="prose">
            <p>Post content goes here...</p>
          </div>
        </article>
      </main>

      <footer class="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
        <p>Built with Ono</p>
      </footer>
    </div>
  `;

  const css = await generateCSS(htmlContent);
  await matchCodeSnapshot(css, TEST_FILE, "blog layout");
});