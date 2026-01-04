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

詳細なドキュメントは[ルートのREADME](../../README.md)を参照してください。
