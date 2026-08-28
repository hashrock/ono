# @hashrock/ono-visual-editor

Ono用の簡易ビジュアルWebエディタ（Vite + React）。左でJSXを編集し、中央でOnoのブラウザコンパイラ（sucrase + UnoCSS、Web Worker上）がレンダリングしたプレビューを見ながら、要素をクリックして右のインスペクタから編集できます。

## できること

- プレビュー上の要素をクリックして選択（ソース側の該当範囲もハイライト）
- `class` のGUI編集：クラスはチップ表示（クリックで削除、入力欄で追加）。余白・サイズ・タイポグラフィ・色（パレット＋シェード）・角丸・ボーダー・影・レイアウトはセレクトやスウォッチで切り替え。`sm:` や `hover:` 付きなどGUIが扱わないクラスはチップのまま保持されます
- テキスト / その他の文字列属性の編集
- 要素の削除・複製・親要素の選択
- **ドラッグ＆ドロップで移動**：プレビュー上で要素を掴んで他の要素の前後にドロップ（横並びなら左右、縦積みなら上下にドロップ線が出ます）。コンポーネントのルート（例: `Card` の外側の div）を掴むと、親ファイル側の `<Card>` 使用箇所が移動します
- **挿入パレット**：プレビュー上部のタイル（Heading / Paragraph / Button / Link / Box / Row / Image / List / Input / Divider）をプレビューへ**ドラッグ＆ドロップ**して要素の前後に挿入、またはクリックで選択要素の直後に挿入。挿入した要素はそのまま選択されます
- Undo / Redo（ボタン、または ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z / ⌘/Ctrl+Y。画面のどこにフォーカスがあっても効きます。テキスト入力中はブラウザ標準の Undo が優先）
- 複数ファイル（`components/*.jsx` からのimport）対応。コンポーネント内部の要素を選択すると自動でそのファイルのタブに切り替わります
- 同じコンポーネントが複数回使われている場合も、クリックしたインスタンスに枠が付きます（インスペクタに「Instance n of N」を表示。編集はソース側なので全インスタンスに反映）

ビジュアル編集は全てJSXソースへのテキスト編集として反映されるため、フォーマットは保持されます。

## 構成

```
index.html              エントリ（#root）
src/main.jsx            React のマウント
src/App.jsx             DOM 由来の情報をコマンドに変換して dispatch、コンパイルの副作用
src/editor.js           純粋な reducer：編集コマンド（setAttr / setText / remove / duplicate / move / insert）と select / setSource / undo / redo / load
src/useCompiler.js      コンパイラ Worker のフック（デバウンス・古い応答の破棄）
src/components/
  Editor.jsx            タブ + ファイルごとの textarea
  Preview.jsx           iframe への描画、クリック/ホバー/ショートカット
  Inspector.jsx         選択要素の属性・アクション
  Palette.jsx           挿入パレット（HTML5 DnD でプレビューへドロップ）
  ClassEditor.jsx       クラスのチップ + GUI コントロール + カラーピッカー
  CommitInput.jsx       Enter / blur で確定する入力
jsx-source.js           JSX ソースモデル（純粋ロジック、Node でテスト）
（editor.js も Node でテスト）
uno-controls.js         UnoCSS コントロール定義（純粋ロジック、Node でテスト）
compiler.worker.js      Ono のブラウザコンパイラを動かす Web Worker
```

## 仕組み

状態は `useReducer` で一元管理し、すべての編集は `{ type, target: { filename, index }, ... }` 形式のコマンドとして reducer に渡されます。reducer は該当ファイルのソースを書き換え、履歴（past / future）と次に選択すべき要素を決め、`compile: 'now' | 'soon'` で App にコンパイルを促します。UI コンポーネントはコマンドを発行するだけで、ソース編集関数を直接呼びません。

ドラッグ移動は `moveElementTo` がソース上で要素を切り出して別の要素の前後に挿入します（同一ファイル内のみ。インデントは移動先に合わせます）。

`uno-controls.js` が「コントロール＝クラスリスト内の1スロット」（例: padding-x、text color）を定義し、現在値の読み取りとその場での置換を行います。

`jsx-source.js` がsucraseのトークナイザで各ファイルのJSX要素の位置を求め、ホスト要素（小文字タグ）に `data-ono-id="<file>#<index>"` を付与してからOnoでレンダリングします。プレビューのDOMからこのIDを辿り、元のソース範囲を書き換えます。

## 開発

```bash
pnpm dev      # 開発サーバーを起動
pnpm build    # 本番用にビルド
pnpm test     # ソース編集ロジックのテスト
```
