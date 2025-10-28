# Mini JSX

A lightweight JSX library for static site generation (SSG).

## Features

- Minimal JSX runtime for building static HTML sites
- Built-in bundler for JSX files
- CLI tool for building JSX to HTML
- Development server with live reload
- File watching for automatic rebuilds
- Support for components and props
- Uses TypeScript's JSX transform

## Installation

### Global Installation

```bash
npm install -g mini-jsx
```

### Local Installation

```bash
npm install mini-jsx
```

## Usage

### CLI Commands

**Build** - Build a JSX file to HTML:

```bash
mini-jsx build example/index.jsx
```

**Build with Watch** - Watch for changes and rebuild automatically:

```bash
mini-jsx build example/index.jsx --watch
```

This will:
- Build your JSX file to HTML
- Watch for changes in `.jsx` files
- Automatically rebuild when files change
- No live reload (simple file watching)

**Dev Server** - Start a development server with live reload:

```bash
mini-jsx dev example/index.jsx
```

This will:
- Build your JSX file to HTML
- Start an HTTP server (default: http://localhost:3000)
- Watch for changes and rebuild automatically
- Live reload the browser when files change

You can specify a custom port:

```bash
mini-jsx dev example/index.jsx --port 8080
```

**Help** - Show usage information:

```bash
mini-jsx --help
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
          <p>Hello, Mini JSX!</p>
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
mini-jsx build example/index.jsx
```

This generates `example/index.html`:

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
      <p>Hello, Mini JSX!</p>
    </main>
  </body>
</html>
```

## Configuration

### TypeScript/JSX Setup

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "mini-jsx"
  }
}
```

Or use JSDoc comments in your `.jsx` files:

```jsx
/** @jsxImportSource mini-jsx */
```

## Development

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Link for Local Development

```bash
npm link
```

This allows you to use the `mini-jsx` command globally while developing.

## API

### JSX Runtime

```javascript
import { createElement } from 'mini-jsx/jsx-runtime';
```

The JSX runtime automatically handles JSX transformation when using TypeScript or Babel.

### Renderer

```javascript
import { renderToString } from 'mini-jsx';

const html = renderToString(<div>Hello</div>);
```

### Bundler

```javascript
import { bundle } from 'mini-jsx';

const code = await bundle('./path/to/file.jsx');
```

## License

MIT
