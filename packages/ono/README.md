# @hashrock/ono

Minimalist SSG framework with JSX, powered by TypeScript's JSX transformer.

## Install

```bash
npm install @hashrock/ono
```

## Usage

```jsx
/** @jsxImportSource @hashrock/ono */
export default function App() {
  return <h1>Hello, Ono!</h1>;
}
```

```bash
npx ono build index.jsx
npx ono dev index.jsx
```

## Features

- JSX to static HTML
- Dev server with live reload
- UnoCSS integration
- Content collections (Markdown)
- Dynamic routes (`[slug].jsx`)

See [root README](../../README.md) for full documentation.
