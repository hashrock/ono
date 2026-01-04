# @hashrock/ono

ミニマリストなSSGフレームワーク。JSXとTypeScriptのJSXトランスフォーマーを活用。

## インストール

```bash
npm install @hashrock/ono
```

## 使い方

```jsx
export default function App() {
  return <h1>Hello, Ono!</h1>;
}
```

```bash
npx ono build index.jsx
npx ono dev index.jsx
```

## 機能

- JSXから静的HTMLへの変換
- ライブリロード付き開発サーバー
- UnoCSS統合
- コンテンツコレクション（Markdown）
- 動的ルート（`[slug].jsx`）

## 制限事項

- **React Fragmentは非対応**: `<>...</>` や `<React.Fragment>` はサポートされていません。代わりに配列や親要素でラップしてください。

```jsx
// NG: React Fragmentは使用不可
<>
  <div>Item 1</div>
  <div>Item 2</div>
</>

// OK: 配列を使用
[
  <div>Item 1</div>,
  <div>Item 2</div>
]

// OK: 親要素でラップ
<div>
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

詳細なドキュメントは[ルートのREADME](../../README.md)を参照してください。
