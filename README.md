# Ono

ミニマリストなSSGフレームワーク。JSXとTypeScriptのJSXトランスフォーマーを活用

## なぜOnoなのか？

OnoはAstroのミニマルな代替として設計されており、TypeScriptの組み込みJSX変換機能を活用しています。コアとなる哲学は：

- **最小限の依存関係**: TypeScript標準の`tsx`トランスフォーム機能を使用し、複雑なビルドツールチェーンを回避
- **高い移植性**: Web Workersやブラウザ上でも動作できるほど軽量に設計
- **シンプルなアーキテクチャ**: 静的サイト生成機能の最小限のサブセットに焦点を当て、本当に重要なものに集中
- **将来のビジョン**: ブラウザベースのREPL体験とクライアントサイドでの静的サイト生成を実現

重量級フレームワークとは異なり、Onoはシンプルさを追求しています。フル機能フレームワークの複雑さなしに、JSXとコンポーネントベースの開発のパワーを求める開発者に最適です。

## パッケージ

これは以下のパッケージを含むモノレポです：

| パッケージ | 説明 | npm |
|---------|-------------|-----|
| [@hashrock/ono](./packages/ono) | CLIを備えたコアSSGフレームワーク | [![npm](https://img.shields.io/npm/v/@hashrock/ono)](https://www.npmjs.com/package/@hashrock/ono) |
| [create-ono](./packages/create-ono) | プロジェクトスキャフォールディングツール | [![npm](https://img.shields.io/npm/v/create-ono)](https://www.npmjs.com/package/create-ono) |
| [@hashrock/ono-repl](./packages/repl) | ブラウザベースのREPLプレイグラウンド | - |
| [@hashrock/ono-lp](./packages/ono-lp) | LLM搭載のランディングページジェネレーター | - |

## クイックスタート

### 新規プロジェクトの作成

最も簡単な始め方は`create-ono`を使用することです：

```bash
npm create ono my-project
cd my-project
npm install
npx ono dev
```

### オンラインで試す

**[Ono REPL](https://hashrock.github.io/ono/)** - Worker搭載のJSXプレイグラウンドをブラウザで！

### 手動セットアップ

または、シンプルなJSXファイルを作成して直接ビルドすることもできます：

```bash
# Onoをインストール
npm install @hashrock/ono

# JSXファイルを作成
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

# ビルド
npx ono build index.jsx

# または開発サーバーを起動
npx ono dev index.jsx
```

## 機能

- 静的HTMLサイト構築用のミニマルなJSXランタイム
- JSXファイル用の組み込みバンドラー
- JSXからHTMLへのビルド用CLIツール
- ライブリロード付き開発サーバー
- 自動再ビルド用のファイル監視
- コンポーネントとpropsのサポート
- アトミックCSS生成用のUnoCSS統合
- マルチページサイト用のpagesディレクトリサポート
- Markdownサポート付きのコンテンツコレクション
- `[slug].jsx`パターンによる動的ルート
- TypeScriptのJSXトランスフォームを使用

## 制限事項

- **React Fragmentは非対応**: `<>...</>` や `<React.Fragment>` はサポートされていません。代わりに配列や親要素でラップしてください。

## CLI使用方法

### ビルド

JSXファイルを静的HTMLにビルド：

```bash
ono build                  # pages/ディレクトリ内のすべてのページをビルド
ono build pages            # pages/ディレクトリ内のすべてのページをビルド
ono build example/index.jsx # 単一ファイルをビルド
ono build --output dist    # 出力ディレクトリを指定
```

### 開発サーバー

ライブリロード付きの開発サーバーを起動：

```bash
ono dev                    # pages/ディレクトリ用の開発サーバーを起動
ono dev pages              # pages/ディレクトリ用の開発サーバーを起動
ono dev example/index.jsx  # 単一ファイル用の開発サーバーを起動
ono dev --port 8080        # カスタムポートで開発サーバーを起動
ono dev --output build     # カスタム出力ディレクトリを使用
```

## JSXの例

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

## UnoCSS統合

OnoはUnoCSSと自動的に統合されます。JSXでユーティリティクラスを使用するだけです：

```jsx
export default function App() {
  return (
    <div class="max-w-800px mx-auto p-8">
      <h1 class="text-3xl font-bold text-blue-600">
        Welcome to Ono
      </h1>
      <p class="mt-4 text-gray-700">
        UnoCSSユーティリティは自動的に生成されます！
      </p>
    </div>
  );
}
```

カスタム設定用に、プロジェクトルートに`uno.config.js`ファイルを作成します：

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

## ページモード

Onoは`pages/`ディレクトリにJSXファイルを配置することでマルチページサイトの構築をサポートします：

```
pages/
├── index.jsx          → dist/index.html
├── about.jsx          → dist/about.html
└── blog/
    └── first-post.jsx → dist/blog/first-post.html
```

## 設定

### TypeScript/JSXのセットアップ

`tsconfig.json`に追加：

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@hashrock/ono"
  }
}
```

または`.jsx`ファイルでJSDocコメントを使用：

```jsx
/** @jsxImportSource @hashrock/ono */
```

## API

```javascript
// JSXランタイム
import { createElement } from '@hashrock/ono/jsx-runtime';

// レンダラー
import { renderToString } from '@hashrock/ono';
const html = renderToString(<div>Hello</div>);

// バンドラー
import { bundle } from '@hashrock/ono';
const code = await bundle('./path/to/file.jsx');

// コンテンツコレクション
import { getCollection } from '@hashrock/ono/content';
const posts = await getCollection('blog');
```

## 開発

これはpnpm workspacesで管理されているモノレポです。

### セットアップ

```bash
# pnpmがインストールされていない場合
npm install -g pnpm

# 依存関係をインストール
pnpm install

# すべてのテストを実行
pnpm test

# すべてのパッケージをビルド
pnpm build
```

### 個別パッケージの操作

```bash
# onoパッケージのテストを実行
pnpm --filter @hashrock/ono test

# REPL開発サーバーを起動
pnpm --filter @hashrock/ono-repl dev

# REPLをビルド
pnpm --filter @hashrock/ono-repl build
```

### テスト

```bash
# ユニットテスト
pnpm --filter @hashrock/ono test

# スナップショットテスト
pnpm --filter @hashrock/ono test:snapshot

# スナップショットを更新
pnpm --filter @hashrock/ono test:snapshot:update
```

スナップショットテストの詳細は[packages/ono/SNAPSHOT_TESTING.md](./packages/ono/SNAPSHOT_TESTING.md)を参照してください。

## ライセンス

MIT
