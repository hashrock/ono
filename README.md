# Ono

Minimalist SSG framework with JSX, powered by TypeScript's JSX transformer

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
- Pages directory support for multi-page sites
- Content collections with Markdown support
- Dynamic routes with `[slug].jsx` pattern
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

Or create a simple JSX file and build it:

```bash
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
npx @hashrock/ono build index.jsx

# Or start a dev server
npx @hashrock/ono dev index.jsx
```

## Usage

### CLI Commands

**Build** - Build JSX files to static HTML:

```bash
ono build                  # Build all pages in pages/ directory
ono build pages            # Build all pages in pages/ directory
ono build example/index.jsx # Build a single file
ono build --output dist    # Specify output directory
```

This will:
- Build your JSX file(s) to HTML
- Copy files from `public/` directory
- Generate UnoCSS automatically

**Dev Server** - Start a development server with live reload:

```bash
ono dev                    # Start dev server for pages/ directory
ono dev pages              # Start dev server for pages/ directory
ono dev example/index.jsx  # Start dev server for a single file
ono dev --port 8080        # Start dev server on custom port
ono dev --output build     # Use custom output directory
```

This will:
- Build your JSX file(s) to HTML
- Start an HTTP server (default: http://localhost:3000)
- Watch for changes and rebuild automatically
- Live reload the browser when files change
- Generate UnoCSS automatically

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
