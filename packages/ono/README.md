# @hashrock/ono

ミニマリストなSSGフレームワーク。JSXをsucraseで変換。

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

- JSX/TSXから静的HTMLへの変換（sucrase。型チェックなし）
- `pages/` ディレクトリによるマルチページ（ディレクトリ構造を保持）
- ライブリロード付き開発サーバー
- UnoCSS統合（`uno.config.js` で拡張可能）
- `public/` の静的ファイルコピー
- barrels: ディレクトリ内のJSXを `meta` 付きで一覧化するバレルの自動生成
- Nodeでもブラウザ（Web Worker）でも動く同一のバンドラー

## 制限事項

- **名前空間付きJSX属性は非対応**: `xlink:href="..."` のような属性はsucraseが解釈できません。`{...{ "xlink:href": "..." }}` のようにスプレッドで渡してください。
- **トップレベル `await` は非対応**: ページモジュールの最上位で `await` は使えません。

詳細なドキュメントは[ルートのREADME](../../README.md)を参照してください。
