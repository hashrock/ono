# Ono SSG - LLM 向けガイド

Ono は最小限の JSX 静的サイトジェネレーター。TypeScript の JSX 変換機能を利用。

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

## API

```js
import { renderToString } from "@hashrock/ono/renderer";
import { bundle } from "@hashrock/ono/bundler";
```

## 重要なポイント

- 各ページは`export default`で完全な HTML 文書を返す関数をエクスポート
- `class`属性は`class`のまま使用（`className`も可）
- UnoCSS はクラス名から自動で CSS を生成

## 注意: @jsxImportSource は使用しない

`/** @jsxImportSource @hashrock/ono */` プラグマは**使用しないこと**。

理由: Ono は TypeScript の classic JSX モード（`h`関数を使用）でトランスパイルするが、`@jsxImportSource`プラグマがあると、TypeScript コンパイラが自動的に automatic JSX モード（`_jsx`/`_jsxs`を使用）に切り替わり、`_jsxs is not defined`エラーが発生する。

```jsx
// NG - エラーになる
/** @jsxImportSource @hashrock/ono */
export default function Page() { ... }

// OK - プラグマなしで使用
export default function Page() { ... }
```
