# Ono

ミニマリストなSSGフレームワーク。JSXを[sucrase](https://github.com/alangpierce/sucrase)で変換

## なぜOnoなのか？

OnoはAstroのミニマルな代替として設計されており、軽量なJSXトランスパイラであるsucraseを活用しています。コアとなる哲学は：

- **最小限の依存関係**: sucrase（純JS・数百KB）によるJSX/TS変換のみで、複雑なビルドツールチェーンを回避
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
echo 'export default function App() {
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
- `public/`ディレクトリの静的ファイルコピー
- barrels: ディレクトリ内のJSXを`meta`付きで一覧化するバレルファイルの自動生成
- sucraseによるJSX/TypeScript変換（型チェックなし。型検査はエディタや`tsc --noEmit`に委ねる）

## 制限事項

- **名前空間付きJSX属性は非対応**: `xlink:href="..."` のような属性はsucraseが解釈できません。`{...{ "xlink:href": "..." }}` のようにスプレッドで渡してください。
- **トップレベル `await` は非対応**: ページモジュールの最上位で `await` は使えません。

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

カスタム設定用に、プロジェクトルートに`uno.config.js`ファイルを作成します。プレーンなオブジェクトで十分です（Onoが`presetUno`を適用した上でこの設定をマージします）：

```javascript
export default {
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

## プロジェクト構造

```
project/
├── pages/                 # JSXページ → dist/*.html（ディレクトリ構造を保持）
│   ├── index.jsx         → dist/index.html
│   ├── about.jsx         → dist/about.html
│   └── blog/
│       └── first-post.jsx → dist/blog/first-post.html
├── components/           # 再利用可能なコンポーネント（ページから相対パスでimport）
├── public/               # 静的ファイル（dist/ にそのままコピー）
├── barrels/              # （任意）バレル生成対象のディレクトリ
├── uno.config.js         # （任意）UnoCSS設定
└── dist/                 # 出力先（uno.css もここに生成）
```

## Barrels（コンテンツ一覧）

`barrels/<name>/` にJSX/TSXファイルを置くと、ビルド時に `barrels/<name>.js` が自動生成されます（生成物なので `.gitignore` 推奨）。各ファイルの `default` エクスポート（コンポーネント）と `meta` エクスポートがまとめられ、ブログ一覧のようなページを書けます。生成はファイル名だけから行われ、記事の中身はビルド時に評価されません。

```jsx
// barrels/blog/hello-world.jsx
export const meta = { title: "Hello World", date: "2025-01-04" };
export default function HelloWorld() {
  return <article><h1>{meta.title}</h1></article>;
}
```

```jsx
// pages/blog.jsx
import { entries, posts } from "../barrels/blog.js";

export default function Blog() {
  return (
    <ul>
      {entries.map((id) => {
        const { component: Post, meta } = posts[id];
        return <li><h2>{meta.title}</h2><Post /></li>;
      })}
    </ul>
  );
}
```

生成されるバレルは `entries`（ファイル名順のID配列）と `posts`（ID → `{ component, meta }`、`meta` 未定義なら `null`）をエクスポートします。

## API

CLIを使わずにプログラムから利用する場合：

```javascript
// JSXランタイム（変換後のJSXが呼び出す h / Fragment）
import { h, Fragment } from "@hashrock/ono";

// レンダラー: VNode → HTML文字列
import { renderToString } from "@hashrock/ono/renderer";
const html = renderToString(h("div", null, "Hello"));

// トランスフォーマー: JSX/TS → JS（sucrase）
import { transformJSX } from "@hashrock/ono/transformer";

// バンドラー: 仮想ファイルシステム上のモジュールを1本のスクリプトに（Node/ブラウザ共用）
import { bundle } from "@hashrock/ono/bundler";
const { code } = await bundle({
  entry: "index.jsx",
  load: (id) => files[id],
  resolve: (specifier, fromId) => /* 相対パスをモジュールIDに解決 */,
});

// ブラウザ用コンパイラ（REPLが使用）: ファイル群 → { html, css }
import { compileProject } from "@hashrock/ono/browser/compiler";
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
# テストを実行（node:test）
pnpm --filter @hashrock/ono test

# スナップショット（*.test.js.snapshot）を更新
pnpm --filter @hashrock/ono test:update

# JSDocベースの型チェック
pnpm --filter @hashrock/ono typecheck
```

`test/golden.test.js` は同じ入力をNodeビルドとブラウザ（REPL）経路の両方で処理し、同一のHTMLになることを検証します。

## ライセンス

MIT
