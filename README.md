# Ono

Minimalist SSG framework with JSX, powered by TypeScript's JSX transformer

## Why Ono?

Ono is designed to be a minimal alternative to Astro, leveraging TypeScript's built-in JSX transformation capabilities. The core philosophy is:

- **Minimal Dependencies**: Uses TypeScript's standard `tsx` transform feature, avoiding complex build toolchains
- **High Portability**: Designed to be lightweight enough to run in Web Workers or even entirely in the browser
- **Simple Architecture**: A minimal subset of static site generation features, focusing on what matters most
- **Future Vision**: Enable browser-based REPL experiences and client-side static site generation

Unlike heavyweight frameworks, Ono embraces simplicity. It's perfect for developers who want the power of JSX and component-based development without the complexity of a full framework.

## Packages

This is a monorepo containing the following packages:

| Package | Description | npm |
|---------|-------------|-----|
| [@hashrock/ono](./packages/ono) | Core SSG framework with CLI | [![npm](https://img.shields.io/npm/v/@hashrock/ono)](https://www.npmjs.com/package/@hashrock/ono) |
| [create-ono](./packages/create-ono) | Project scaffolding tool | [![npm](https://img.shields.io/npm/v/create-ono)](https://www.npmjs.com/package/create-ono) |
| [@hashrock/ono-repl](./packages/repl) | Browser-based REPL playground | - |

## Quick Start

### Create a New Project

The easiest way to start is using `create-ono`:

```bash
npm create ono my-project
cd my-project
npm install
npx ono dev
```

### Try Online

**[Ono REPL](https://hashrock.github.io/ono/)** - Worker-powered JSX playground in your browser!

### Manual Setup

Or create a simple JSX file and build it directly:

```bash
# Install Ono
npm install @hashrock/ono

# Create a JSX file
echo '/** @jsxImportSource @hashrock/ono */
export default function App() {
  return (
    <html>
      <head><title>Hello Ono</title></head>
      <body>
        <h1>Hello, Ono!</h1>
      </body>
    </html>
  );
}' > index.jsx

# Build it
npx ono build index.jsx

# Or start a dev server
npx ono dev index.jsx
```

## Features

- Minimal JSX runtime for building static HTML sites
- Built-in bundler for JSX files
- CLI tool for building JSX to HTML
- Development server with live reload
- File watching for automatic rebuilds
- Support for components and props
- Integrated UnoCSS for atomic CSS generation
- Pages directory support for multi-page sites
- Content collections with Markdown support
- Dynamic routes with `[slug].jsx` pattern
- Uses TypeScript's JSX transform

## CLI Usage

### Build

Build JSX files to static HTML:

```bash
ono build                  # Build all pages in pages/ directory
ono build pages            # Build all pages in pages/ directory
ono build example/index.jsx # Build a single file
ono build --output dist    # Specify output directory
```

### Dev Server

Start a development server with live reload:

```bash
ono dev                    # Start dev server for pages/ directory
ono dev pages              # Start dev server for pages/ directory
ono dev example/index.jsx  # Start dev server for a single file
ono dev --port 8080        # Start dev server on custom port
ono dev --output build     # Use custom output directory
```

## JSX Example

```jsx
/** @jsxImportSource @hashrock/ono */
export default function App() {
  return (
    <html>
      <head>
        <title>My Site</title>
      </head>
      <body>
        <Header title="Welcome" />
        <main>
          <p>Hello, Ono!</p>
        </main>
      </body>
    </html>
  );
}

function Header({ title }) {
  return (
    <header>
      <h1>{title}</h1>
    </header>
  );
}
```

## UnoCSS Integration

Ono automatically integrates with UnoCSS. Simply use utility classes in your JSX:

```jsx
export default function App() {
  return (
    <div class="max-w-800px mx-auto p-8">
      <h1 class="text-3xl font-bold text-blue-600">
        Welcome to Ono
      </h1>
      <p class="mt-4 text-gray-700">
        UnoCSS utilities are automatically generated!
      </p>
    </div>
  );
}
```

Create a `uno.config.js` file in your project root for custom configuration:

```javascript
import { presetUno } from "unocss";

export default {
  presets: [presetUno()],
  theme: {
    colors: {
      primary: "#0070f3",
    },
  },
  shortcuts: {
    "btn": "px-4 py-2 rounded bg-primary text-white",
  },
};
```

## Pages Mode

Ono supports building multi-page sites by placing JSX files in a `pages/` directory:

```
pages/
├── index.jsx          → dist/index.html
├── about.jsx          → dist/about.html
└── blog/
    └── first-post.jsx → dist/blog/first-post.html
```

## Configuration

### TypeScript/JSX Setup

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@hashrock/ono"
  }
}
```

Or use JSDoc comments in your `.jsx` files:

```jsx
/** @jsxImportSource @hashrock/ono */
```

## API

```javascript
// JSX Runtime
import { createElement } from '@hashrock/ono/jsx-runtime';

// Renderer
import { renderToString } from '@hashrock/ono';
const html = renderToString(<div>Hello</div>);

// Bundler
import { bundle } from '@hashrock/ono';
const code = await bundle('./path/to/file.jsx');

// Content Collections
import { getCollection } from '@hashrock/ono/content';
const posts = await getCollection('blog');
```

## Development

This is a monorepo managed with pnpm workspaces.

### Setup

```bash
# Install pnpm if not installed
npm install -g pnpm

# Install dependencies
pnpm install

# Run all tests
pnpm test

# Build all packages
pnpm build
```

### Working with Individual Packages

```bash
# Run tests for ono package
pnpm --filter @hashrock/ono test

# Start REPL dev server
pnpm --filter @hashrock/ono-repl dev

# Build REPL
pnpm --filter @hashrock/ono-repl build
```

### Testing

```bash
# Unit tests
pnpm --filter @hashrock/ono test

# Snapshot tests
pnpm --filter @hashrock/ono test:snapshot

# Update snapshots
pnpm --filter @hashrock/ono test:snapshot:update
```

See [packages/ono/SNAPSHOT_TESTING.md](./packages/ono/SNAPSHOT_TESTING.md) for details on snapshot testing.

## License

MIT
