# Mini JSX Development TODO

## Phase 1: Project Setup ✅
- [x] Create example directory structure
- [x] Create JSX examples with components
- [x] Create expected HTML output example
- [x] Create TODO.md

## Phase 2: Core Runtime (JSX Factory)
基本的なJSXを動作させるための最小限の実装

### 2.1 JSX Runtime
- [ ] `src/jsx-runtime.js` を作成
  - `createElement(tag, props, ...children)` 関数
  - HTML要素の生成
  - props の処理（attributes, style, className など）
  - children の処理（配列のフラット化、文字列化）

### 2.2 基本テスト
- [ ] 簡単なテストファイル作成 `test/basic.jsx`
  ```jsx
  function Test() {
    return <div>Hello</div>;
  }
  ```
- [ ] 手動でTypeScriptのtransformを確認

## Phase 3: Rendering System
JSXをHTMLに変換するレンダラー

### 3.1 Renderer
- [ ] `src/renderer.js` を作成
  - VNode をHTMLに変換する `renderToString()` 関数
  - 自己閉じタグの処理（`<img />`, `<br />` など）
  - エスケープ処理（XSS対策）
  - コンポーネント関数の実行

### 3.2 コンポーネントサポート
- [ ] 関数コンポーネントの呼び出し
- [ ] props の受け渡し
- [ ] children の処理

## Phase 4: Build System
ファイルの読み込みとビルド処理

### 4.1 Module Resolution
- [ ] `src/resolver.js` を作成
  - JSXファイルの読み込み
  - import文の解析
  - 依存関係の解決（DFS/BFSでの走査）
  - 循環参照のチェック

### 4.2 TypeScript Transform
- [ ] `src/transformer.js` を作成
  - TypeScript API で JSX → JS 変換
  - `jsxFactory` の設定
  - import/export の処理

### 4.3 Bundler
- [ ] `src/bundler.js` を作成
  - すべての依存コンポーネントを収集
  - 1つのモジュールグラフに統合
  - 評価順序の決定

## Phase 5: CLI Tool
コマンドラインインターフェース

### 5.1 CLI実装
- [ ] `src/cli.js` を作成
  - コマンドライン引数のパース
  - `mini-jsx build <file>` コマンド
  - エラーハンドリング
  - 進捗表示

### 5.2 Package Setup
- [ ] `package.json` の作成
  - dependencies の設定
  - bin フィールドの設定
  - scripts の設定

### 5.3 設定ファイル
- [ ] `tsconfig.json` の作成
  - jsx: "react"
  - jsxFactory: "h"
  - module resolution 設定

## Phase 6: Testing & Refinement
統合テストと改善

### 6.1 Example のビルドテスト
- [ ] `mini-jsx build example/index.jsx` の実行
- [ ] 出力HTMLと expected output の比較
- [ ] 問題点の修正

### 6.2 エッジケースの処理
- [ ] 空の children
- [ ] null/undefined の処理
- [ ] 配列の children
- [ ] Fragment サポート（もし必要なら）

### 6.3 エラーハンドリング
- [ ] 存在しないファイル
- [ ] 循環参照
- [ ] 不正なJSX
- [ ] わかりやすいエラーメッセージ

## Phase 7: Documentation & Polish
ドキュメントと最終調整

### 7.1 Documentation
- [ ] README.md の更新
  - インストール方法
  - 使い方
  - API リファレンス
  - Example の説明

### 7.2 追加機能（オプション）
- [ ] watch mode
- [ ] 複数ファイルの一括ビルド
- [ ] ソースマップ
- [ ] minification

---

## Development Strategy

### 推奨する開発順序

1. **Phase 2.1**: JSX Runtime の基本実装
   - まずは `createElement` が動くことを確認

2. **Phase 3.1**: Renderer の基本実装
   - VNode → HTML変換を実装

3. **Phase 2.2 + 手動テスト**:
   - 手動でTypeScriptのトランスパイルを実行して動作確認
   - `npx tsc --jsx react --jsxFactory h test.jsx`

4. **Phase 3.2**: コンポーネントサポート
   - 関数コンポーネントが動くようにする

5. **Phase 4**: Build System
   - import解決とバンドリング

6. **Phase 5**: CLI
   - 全体を統合するCLIツール

7. **Phase 6-7**: テストと改善

### Next Step
**Start with Phase 2.1**: `src/jsx-runtime.js` の作成から始める
