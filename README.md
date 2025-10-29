# Ono

> Minimalist SSG framework with JSX, powered by TypeScript's JSX transformer

A lightweight JSX library for static site generation with UnoCSS support.

## Why Ono?

Ono is designed to be a minimal alternative to Astro, leveraging TypeScript's built-in JSX transformation capabilities. The core philosophy is:

- **Minimal Dependencies**: Uses TypeScript's standard `tsx` transform feature, avoiding complex build toolchains
- **High Portability**: Designed to be lightweight enough to run in Web Workers or even entirely in the browser
- **Simple Architecture**: A minimal subset of static site generation features, focusing on what matters most
- **Future Vision**: Enable browser-based REPL experiences and client-side static site generation

Unlike heavyweight frameworks, Ono embraces simplicity. It's perfect for developers who want the power of JSX and component-based development without the complexity of a full framework.

## Features

- Minimal JSX runtime for building static HTML sites
- Built-in bundler for JSX files
- CLI tool for building JSX to HTML
- Development server with live reload
- File watching for automatic rebuilds
- Support for components and props
- Integrated UnoCSS for atomic CSS generation
- Quick project initialization with templates
- Pages directory support for multi-page sites
- Uses TypeScript's JSX transform

## Installation

### Global Installation

```bash
npm install -g @hashrock/ono
```

### Local Installation

```bash
npm install @hashrock/ono
```

## Quick Start

**Try it online**: [Ono REPL](https://hashrock.github.io/ono/) - Worker-powered JSX playground!

Or initialize a new project with npx (no installation required):

```bash
npx @hashrock/ono init my-project
cd my-project
npm install
npm run dev
```

This creates a complete project structure with:
- `pages/` directory with example page
- `components/` directory with Layout and Hello components
- `public/` directory for static assets
- UnoCSS integration pre-configured
- Development and build scripts

## Usage

### CLI Commands

**Init** - Initialize a new Ono project:

```bash
ono init
ono init my-project
```

**Build** - Build a JSX file to HTML:

```bash
ono build example/index.jsx
```

**Build Pages** - Build all pages in a directory:

```bash
ono build pages
```

**Build with Watch** - Watch for changes and rebuild automatically:

```bash
ono build pages --watch
```

This will:
- Build your JSX files to HTML
- Watch for changes in `.jsx` files
- Automatically rebuild when files change
- No live reload (simple file watching)

**Dev Server** - Start a development server with live reload:

```bash
ono dev
ono dev pages
ono dev example/index.jsx
```

This will:
- Build your JSX file(s) to HTML
- Start an HTTP server (default: http://localhost:3000)
- Watch for changes and rebuild automatically
- Live reload the browser when files change
- Generate UnoCSS automatically

You can specify custom options:

```bash
ono dev --port 8080 --output build
```

**Help** - Show usage information:

```bash
ono --help
```

### JSX Example

Create a JSX file with components:

```jsx
// example/index.jsx
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

Build it:

```bash
ono build example/index.jsx
```

This generates `dist/index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Site</title>
  </head>
  <body>
    <header>
      <h1>Welcome</h1>
    </header>
    <main>
      <p>Hello, Ono!</p>
    </main>
  </body>
</html>
```

### UnoCSS Integration

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

The CSS will be automatically generated to `dist/uno.css` and included in your HTML.

### Custom UnoCSS Configuration

Create a `uno.config.js` file in your project root:

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

## Development

### Install Dependencies

```bash
npm install
```

### Run Tests

Run all unit tests:

```bash
npm test
```

Run snapshot tests:

```bash
npm run test:snapshot
```

Run all tests (unit + snapshot):

```bash
npm run test:all
```

Update snapshots after intentional changes:

```bash
npm run test:snapshot:update
```

### Watch Mode

```bash
npm run test:watch
```

### Testing Strategy

This project uses a comprehensive testing approach:

- **Unit Tests**: Traditional assertion-based tests for core functionality
- **Snapshot Tests**: Capture and verify output consistency for HTML rendering, JSX transformation, and CLI commands
- **Integration Tests**: End-to-end testing of build processes and content collections

For more details about snapshot testing, see [SNAPSHOT_TESTING.md](./SNAPSHOT_TESTING.md).

### Continuous Integration

This project uses GitHub Actions for automated testing. The CI pipeline:

- Tests on Node.js 22.x with Ubuntu
- Runs comprehensive unit and snapshot tests
- Validates CLI commands and build processes
- Ensures output consistency across environments

See `.github/workflows/ci.yml` for the full configuration

### Link for Local Development

```bash
npm link
```

This allows you to use the `ono` command globally while developing.

## API

### JSX Runtime

```javascript
import { createElement } from '@hashrock/ono/jsx-runtime';
```

The JSX runtime automatically handles JSX transformation when using TypeScript or Babel.

### Renderer

```javascript
import { renderToString } from '@hashrock/ono';

const html = renderToString(<div>Hello</div>);
```

### Bundler

```javascript
import { bundle } from '@hashrock/ono';

const code = await bundle('./path/to/file.jsx');
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

Each file should export a default function that returns a complete HTML document. Use the Layout component pattern for shared structure across pages.

## License

MIT
