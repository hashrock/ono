# @hashrock/ono-visual-editor

Ono用の簡易ビジュアルWebエディタを、**Reactコンポーネント1個のライブラリ**として提供します。JSXを編集し、Onoのブラウザコンパイラ（sucrase + UnoCSS、Web Worker上）でレンダリングしたプレビューを見ながら、要素をクリックしてインスペクタから編集できます。

```bash
npm install @hashrock/ono-visual-editor @hashrock/ono react react-dom
```

```jsx
import { useState } from 'react';
import { VisualEditor } from '@hashrock/ono-visual-editor';
import '@hashrock/ono-visual-editor/style.css';

const files = {
  'index.jsx': `export default function App() {
  return <h1 class="text-3xl font-bold text-emerald-600">Hello, Ono!</h1>;
}
`,
};

export function App() {
  const [project, setProject] = useState(files);
  // 親要素に高さを与えてください（エディタはコンテナいっぱいに広がります）
  return (
    <div style={{ height: '100vh' }}>
      <VisualEditor files={project} entry="index.jsx" onChange={setProject} />
    </div>
  );
}
```

コンパイラのWeb Workerはビルド時にインライン化されているため、利用側でworkerやアセットの設定は不要です。スタイルは `.ono-ve` 配下にスコープされており、`style.css` を1回importするだけです。

## できること

- プレビュー上の要素をクリックして選択（ソース側の該当範囲もハイライト）
- `class` のGUI編集：クラスはチップ表示（クリックで削除、入力欄で追加）。余白・サイズ・タイポグラフィ・色（パレット＋シェード）・角丸・ボーダー・影・レイアウトはセレクトやスウォッチで切り替え。`sm:` や `hover:` 付きなどGUIが扱わないクラスはチップのまま保持されます
- テキスト / その他の文字列属性の編集
- 要素の削除・複製・親要素の選択
- **ドラッグ＆ドロップで移動**：プレビュー上で要素を掴んで他の要素の前後にドロップ（横並びなら左右、縦積みなら上下にドロップ線が出ます）。コンポーネントのルート（例: `Card` の外側の div）を掴むと、親ファイル側の `<Card>` 使用箇所が移動します
- **挿入パレット**：プレビュー上部のタイル（Heading / Paragraph / Button / Link / Box / Row / Image / List / Input / Divider）をプレビューへ**ドラッグ＆ドロップ**して要素の前後に挿入、またはクリックで選択要素の直後に挿入。挿入した要素はそのまま選択されます
- Undo / Redo（ボタン、または ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z / ⌘/Ctrl+Y。テキスト入力中はブラウザ標準の Undo が優先）
- 複数ファイル（`components/*.jsx` からのimport）対応。コンポーネント内部の要素を選択すると自動でそのファイルのタブに切り替わります
- 同じコンポーネントが複数回使われている場合も、クリックしたインスタンスに枠が付きます（インスペクタに「Instance n of N」を表示。編集はソース側なので全インスタンスに反映）

ビジュアル編集は全てJSXソースへのテキスト編集として反映されるため、フォーマットは保持されます。

## Props

| prop | 型 | 既定値 | 説明 |
|---|---|---|---|
| `files` | `Record<string, string>` | 同梱のサンプル | ファイル名 → ソース。**別のオブジェクト**を渡すとその内容で読み込み直します（`onChange` で受け取ったオブジェクトを渡し戻しても再読み込みは起きません） |
| `entry` | `string` | `'index.jsx'` | プレビューのエントリポイント |
| `onChange` | `(files) => void` | – | 編集のたびに全ファイルを通知 |
| `onSelect` | `(sel \| null) => void` | – | 選択変更時に `{ filename, index, tag }` を通知 |
| `snippets` | `Snippet[]` | `DEFAULT_SNIPPETS` | 挿入パレット（`{ label, icon, code }`） |
| `createWorker` | `() => Worker` | 同梱のコンパイラWorker | コンパイラWorkerを差し替える |
| `header` | `boolean` | `true` | 上部ツールバーの表示 |
| `title` / `tagline` | `ReactNode` | `'Ono Visual Editor'` ほか | ツールバーの見出し |
| `actions` | `ReactNode` | – | Undo / Redo / Run の前に差し込む追加ボタン |
| `statusBar` | `boolean` | `true` | 下部ステータス行の表示 |
| `globalShortcuts` | `boolean` | `true` | `window` にキーボードショートカットを登録。`false` にするとプレビュー内のみ |
| `className` / `style` | | – | ルート要素に付与 |

`files` を一度だけ渡せば非制御コンポーネントとして、新しいオブジェクトを渡し直せばプロジェクトの切り替え・リセットとして使えます（`demo/App.jsx` の "Reset example" が後者の例）。

## ヘッドレスコア

React にもDOMにも依存しない編集ロジックは `@hashrock/ono-visual-editor/core` から使えます（Nodeでも動きます）。独自UIを作る場合はこちら。

```js
import {
  parseElements, setAttr, setText, removeElement, duplicateElement, moveElementTo, insertSnippet, instrument,
  reducer, initialState, elementsOf,          // 編集コマンドの reducer（undo/redo込み）
  GROUPS, classList, readValue, writeValue,   // UnoCSSコントロール
} from '@hashrock/ono-visual-editor/core';
```

## 構成

```
src/
  index.js              ライブラリのエントリ（VisualEditor / DEFAULT_SNIPPETS / EXAMPLE_FILES）
  core.js               ヘッドレスコアのエントリ
  VisualEditor.jsx      DOM 由来の情報をコマンドに変換して dispatch、コンパイルの副作用
  editor.js             純粋な reducer：編集コマンド（setAttr / setText / remove / duplicate / move / insert）と select / setSource / undo / redo / load
  useCompiler.js        コンパイラ Worker のフック（デバウンス・古い応答の破棄）
  jsx-source.js         JSX ソースモデル（純粋ロジック、Node でテスト）
  uno-controls.js       UnoCSS コントロール定義（純粋ロジック、Node でテスト）
  compiler.worker.js    Ono のブラウザコンパイラを動かす Web Worker（ビルド時にインライン化）
  snippets.js           既定の挿入パレット
  example.js            同梱サンプルプロジェクト
  styles.css            `.ono-ve` 配下にスコープしたスタイル
  components/
    Editor.jsx          タブ + ファイルごとの textarea
    Preview.jsx         iframe への描画、クリック/ホバー/ショートカット
    Inspector.jsx       選択要素の属性・アクション
    Palette.jsx         挿入パレット（HTML5 DnD でプレビューへドロップ）
    ClassEditor.jsx     クラスのチップ + GUI コントロール + カラーピッカー
    CommitInput.jsx     Enter / blur で確定する入力
demo/                   エディタをホストするデモアプリ（Vite）
```

## 仕組み

状態は `useReducer` で一元管理し、すべての編集は `{ type, target: { filename, index }, ... }` 形式のコマンドとして reducer に渡されます。reducer は該当ファイルのソースを書き換え、履歴（past / future）と次に選択すべき要素を決め、`compile: 'now' | 'soon'` でコンパイルを促します。UI コンポーネントはコマンドを発行するだけで、ソース編集関数を直接呼びません。

ドラッグ移動は `moveElementTo` がソース上で要素を切り出して別の要素の前後に挿入します（同一ファイル内のみ。インデントは移動先に合わせます）。

`uno-controls.js` が「コントロール＝クラスリスト内の1スロット」（例: padding-x、text color）を定義し、現在値の読み取りとその場での置換を行います。

`jsx-source.js` がsucraseのトークナイザで各ファイルのJSX要素の位置を求め、ホスト要素（小文字タグ）に `data-ono-id="<file>#<index>"` を付与してからOnoでレンダリングします。プレビューのDOMからこのIDを辿り、元のソース範囲を書き換えます。

## 開発

```bash
pnpm dev         # デモアプリの開発サーバー（src を直接読むのでHMRが効く）
pnpm build       # ライブラリを dist/ にビルド
pnpm build:demo  # デモアプリを demo-dist/ にビルド
pnpm test        # ソース編集ロジックのテスト
```
