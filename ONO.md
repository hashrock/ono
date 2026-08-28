# Ono SSG - LLM 向けガイド

Ono は最小限の JSX 静的サイトジェネレーター。JSX/TS の変換に sucrase を利用（型チェックはしない）。

## インストールと基本コマンド

```bash
npm install @hashrock/ono

# ビルド
npx ono build pages/           # pagesディレクトリをビルド
npx ono build index.jsx        # 単一ファイルをビルド

# 開発サーバー（ライブリロード付き）
npx ono dev pages/
```

## プロジェクト構造

```
project/
├── pages/                 # JSXページ → dist/*.html
│   ├── index.jsx         # → dist/index.html
│   └── about.jsx         # → dist/about.html
├── components/           # 再利用可能コンポーネント
├── public/               # 静的ファイル（そのままコピー）
├── barrels/              # コンテンツ一覧用（任意、後述）
├── uno.config.js         # UnoCSS設定（任意）
└── dist/                 # 出力先
```

## 基本的なページ

```jsx
export default function Page() {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>ページタイトル</title>
        <link rel="stylesheet" href="/uno.css" />
      </head>
      <body>
        <h1>Hello Ono</h1>
      </body>
    </html>
  );
}
```

## コンポーネント

```jsx
// components/Card.jsx
export default function Card({ title, children }) {
  return (
    <div class="p-4 border rounded">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}

// pages/index.jsx
import Card from "../components/Card.jsx";

export default function Page() {
  return (
    <html>
      <body>
        <Card title="タイトル">
          <p>コンテンツ</p>
        </Card>
      </body>
    </html>
  );
}
```

## UnoCSS（自動統合）

ユーティリティクラスを使うだけで自動的に CSS が生成される:

```jsx
<div class="max-w-800px mx-auto p-8">
  <h1 class="text-3xl font-bold text-blue-600">タイトル</h1>
  <p class="mt-4 text-gray-700">本文</p>
</div>
```

`dist/uno.css`が自動生成されるので、head でリンク:

```jsx
<link rel="stylesheet" href="/uno.css" />
```

## Barrels（コンテンツ一覧）

`barrels/<name>/*.jsx` を置くと、ビルド時に `barrels/<name>.js` が自動生成される（手で編集しない・`.gitignore` 推奨）。各ファイルは `default`（コンポーネント）と任意の `meta` をエクスポートする。

```jsx
// barrels/blog/hello.jsx
export const meta = { title: "Hello", date: "2025-01-04" };
export default function Hello() { return <article>...</article>; }

// pages/blog.jsx
import { entries, posts } from "../barrels/blog.js";
// entries: ID配列 / posts: { [id]: { component, meta } }（meta 未定義なら null）
```

## API

```js
import { renderToString } from "@hashrock/ono/renderer";
import { transformJSX } from "@hashrock/ono/transformer";
import { bundle } from "@hashrock/ono/bundler"; // ブラウザ互換ミニバンドラ
```

## 重要なポイント

- 各ページは`export default`で完全な HTML 文書を返す関数をエクスポート
- `class`属性は`class`のまま使用（`className`も可）
- Fragment `<>...</>` は使用可
- UnoCSS はクラス名から自動で CSS を生成
- 非対応: 名前空間付き属性（`xlink:href` → `{...{ "xlink:href": "..." }}` で回避）、トップレベル `await`

## 注意: @jsxImportSource は使用しない

`/** @jsxImportSource @hashrock/ono */` プラグマは**使用しないこと**。

理由: Ono は classic JSX モード（`h`関数を使用）でトランスパイルする。`@jsxImportSource` プラグマは automatic モード用で、意味がない。

```jsx
// NG - エラーになる
/** @jsxImportSource @hashrock/ono */
export default function Page() { ... }

// OK - プラグマなしで使用
export default function Page() { ... }
```
