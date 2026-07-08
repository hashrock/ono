# Ono シンプル化計画

全体設計をレビューした結果に基づく、設計・実装・機能のシンプル化計画。
「最小限の依存関係・高い移植性・シンプルなアーキテクチャ」というコア哲学に照らして、
**現状がその哲学からずれている箇所**を特定し、フェーズごとに解消する。

## 現状サマリー

| パッケージ | 役割 | 規模 |
|---|---|---|
| `packages/ono` | コアSSG + CLI | src 約1,600行 / テスト約1,600行 |
| `packages/create-ono` | スキャフォールディング | 約40行 |
| `packages/repl` | ブラウザREPL | 約400行 |
| `packages/ono-lp` | LLM LPジェネレーター | TS約300行 + 重い依存 |
| `packages/example` | サンプルサイト | - |

コアの依存: `typescript`, `unocss`, `@unocss/preset-uno`, `h3`, `ws`

## レビューで見つかった問題点

シンプル化の動機となる具体的な事実。**(A)〜(C) は実害のあるバグ**。

### (A) JSXランタイムが3重に存在し、すでに乖離してバグ化している

1. `src/jsx-runtime.js` — 正規版。`Fragment` 対応済み
2. `src/constants.js` の `INLINE_JSX_RUNTIME` — ビルド時に注入される文字列版。**`Fragment` が未定義**
3. `src/barrels.js` の `loadMeta()` 内のインライン `h` — `flattenChildren` すらない3つ目のコピー

結果: `transformer.js` は `jsxFragmentFactory: 'Fragment'` でコンパイルするため、
**`<>...</>` を使ったページを `ono build` すると `ReferenceError: Fragment is not defined` で失敗する**
（PR #18 で Fragment 対応したのは REPL 経路のみで、CLI 経路は壊れたまま）。

### (B) `uno.config.js` は CLI から一切読まれていない

`commands/dev.js:39` と `commands/build.js:110` は `loadUnoConfig()` を**引数なし**で呼ぶ。
`loadUnoConfig(configPath)` は `path.resolve(undefined)` で即例外 → catch → 常に `{}` を返す。
つまり **ユーザーの `uno.config.js`（テーマ、ショートカット等）はサイレントに無視される**。
それにもかかわらず `unocssConfig` オプションが builder / watcher / commands の全域に配線されている
（常に `{}` しか流れない配管）。

### (C) ネストしたページがフラット化され、衝突する

`builder.js` の `buildFile()` は `basename` しか見ないため:

- `pages/blog/first-post.jsx` → `dist/first-post.html`（ディレクトリ構造消失）
- `pages/index.jsx` と `pages/blog/index.jsx` → 両方 `dist/index.html`（**後勝ちで上書き**）

### (D) バンドラが2実装ある

- `src/bundler.js` + `src/resolver.js`（計218行）: 連結方式。import文を正規表現で除去して結合
- `src/browser/compiler.js`（253行）: 正規表現ベースの簡易モジュールシステム

同じ「JSXの依存解決」を別々の意味論で2回実装している。どちらも正規表現パースで壊れやすい。

### (E) 細かい実装の重複・死にコード

- `debounce` が2実装（`utils.browser.js` 版は誰も使っておらず、`watcher.js` が独自版を持つ）
- `transformer.js` の `transformJSXWithImports()` は本体から未使用（ヒューリスティックなimport自動付与）
- `utils.js` ⇄ `utils.browser.js` の再エクスポート層
- `parseDevArgs` / `parseBuildArgs` がほぼ同一のargv手書きパース
- `constants.js` の過剰な定数化（`HTTP_STATUS.NOT_FOUND` や `ERROR_CODES.ENOENT` など、
  リテラルより読みにくくなる「定数のための定数」）

### (F) 依存関係の過剰・不整合

- `h3`: 静的ファイル配信1ルートのためだけに使用 → `node:http` で40行相当
- `ws`: 「reload」と一言送るためだけに使用 + 専用ポート(35729)を1つ消費
- `unocss`（メタパッケージ）と `@unocss/preset-uno` を二重宣言
- `browser/unocss.js` は `@unocss/core` を import しているが **package.json に未宣言**（幽霊依存）
- `unocss.js` の reset CSS 読み込みが `../node_modules/...` の相対パスハック（pnpm配下で壊れやすい）

### (G) テスト体系の二重化

- unit テストと snapshot テストが transformer / renderer で同じ対象を二重にカバー
- 自作スナップショットフレームワーク `snapshot-utils.js`（139行）+ 専用ドキュメント
  `SNAPSHOT_TESTING.md` — **Node 22 標準の `t.assert.snapshot` で置き換え可能**（engines は要更新）

### (H) サンプル・スコープの散らばり

- サンプルが4箇所: `packages/example`、`packages/ono/example`、`packages/ono/pages`、
  REPL の `main.js` 内ハードコード（さらに `create-ono/template`）
- `packages/ono/example/output.html` などビルド成果物がコミットされている
- `ono-lp` は SSG と無関係の別プロダクト（AI SDK×3 + commander + dotenv + zod という最重量の依存群）で、
  「ミニマリストSSG」というリポジトリの焦点をぼかしている

---

## シンプル化計画

フェーズごとに独立した PR にできる粒度で分割。上から順に価値が高い。

### Phase 1: バグを直す方向への統合（(A)(B)(C)）

**1-1. JSXランタイムの一本化**

`INLINE_JSX_RUNTIME` 文字列と barrels 内のインライン `h` を削除し、
ビルド時の一時ファイルには実体の import を注入する:

```js
import { h, Fragment } from "@hashrock/ono/jsx-runtime";
```

一時ファイルは Node の import で評価されるため node_modules 解決が効く。
ランタイムの定義箇所が `jsx-runtime.js` の1箇所になり、Fragment バグ (A) が構造的に再発しなくなる。

**1-2. UnoCSS 設定読み込みの修正と配管の集約**

- `loadUnoConfig()` をデフォルトで `cwd/uno.config.js` を探すよう修正（(B) の修正）
- 「設定ファイルが無い」以外のエラー（設定ファイル内の構文エラー等）は握りつぶさず表示する
- `unocssConfig` の全域配線をやめ、`generateUnoCSS()` が自分で設定を読む形に集約
  （builder / watcher / commands のシグネチャから `unocssConfig` が消える）

**1-3. 出力パスのディレクトリ構造保持**

`buildFile()` の出力先を「入力ルートからの相対パス」で計算し、
`pages/blog/first-post.jsx → dist/blog/first-post.html` とする（(C) の修正）。
※ 挙動変更だが、現状は衝突・上書きなので実質バグ修正。

### Phase 2: Node側バンドラの廃止（(D) の半分と (E)）

**2-1. bundler.js / resolver.js を削除し、Node のモジュール解決に任せる**

現在の Node 側パイプラインは「自前で依存収集 → トポソート → 連結 → 一時ファイル1個 → import」。
これを「**各 .jsx を変換して一時ディレクトリに書き出し → import specifier の `.jsx`→`.js` 書き換え →
エントリを import**」に変更する。

- 依存解決・トポソート・循環検出・npmパッケージ import をすべて Node 本体に任せられる
- `bundler.js`(81行) + `resolver.js`(137行) と正規表現 import パースが丸ごと消える
- 一時ファイルを `dist/` に書く現状（ビルド失敗時に `_temp_*.js` が成果物に残る）も解消され、
  一時ディレクトリ（`node:os` の tmpdir か `.ono/` ）に隔離される

`browser/compiler.js` はブラウザに Node の解決系がない以上、自前実装が必要なので残す。
ただし現状すでに独立しているので「Node 側と共有している振り」の構造だけ整理する。

**2-2. 死にコード・重複の削除**

- `transformJSXWithImports()` 削除
- `debounce` を1実装に統一（`watcher.js` のエラーログ付き版を採用）
- `utils.js` / `utils.browser.js` の再エクスポート層を解消:
  ブラウザ互換関数は `utils.js` に一本化し、fs 依存の2関数（`cleanupTempFile`,
  `getFilesRecursively`）は使用箇所へ移す
- `parseDevArgs` / `parseBuildArgs` を `node:util` の `parseArgs` による共通パーサ1つに統一
- `constants.js` は実際に共有価値のあるもの（`SELF_CLOSING_TAGS`, `MIME_TYPES`, `DIRS`,
  `PORTS`, `TIMING`）だけに縮小し、`HTTP_STATUS` / `ERROR_CODES` はリテラルへ戻す

### Phase 3: 依存の削減（(F)）

**3-1. `h3` を削除** — `node:http` + 既存の `MIME_TYPES` で静的サーバーを実装（約40行）。

**3-2. `ws` を削除、SSE に移行** — ライブリロードは `EventSource` で十分:

- dev サーバー自身が `/__reload` エンドポイントで SSE を配信（**専用ポート 35729 が不要になる**）
- クライアント注入スクリプトは `new EventSource('/__reload').onmessage = () => location.reload()` の1行相当
- `createWebSocketServer` / ポート衝突フォールバック処理が消える

**3-3. UnoCSS 依存の整理**

- メタパッケージ `unocss` をやめ、実際に使う `@unocss/core` + `@unocss/preset-uno` +
  `@unocss/reset` のみ宣言（幽霊依存の解消も兼ねる）
- reset CSS は `createRequire(import.meta.url).resolve("@unocss/reset/tailwind.css")` で
  正しく解決し、相対パスハックを削除

**達成後のコア依存: `typescript` + `@unocss/*` のみ**（README の哲学と一致する）。

### Phase 4: テストのシンプル化（(G)）

- engines を `>=22` に上げ、自作 `snapshot-utils.js`（139行）を Node 標準の
  `t.assert.snapshot` に置き換え。`SNAPSHOT_TESTING.md` は数行の説明に縮小
- transformer / renderer で unit と snapshot が二重カバーしている部分を統合し、
  「挙動の分岐はunitテスト、出力形式はsnapshot」に役割分担
- Phase 1〜3 の各変更はこのテスト群が回帰防止になるため、実施順は柔軟でよい
  （先にやればフェーズ全体の安全網になる）

### Phase 5: スコープ・サンプルの整理（(H)）— 要オーナー判断

- **`ono-lp` はモノレポから分離を推奨**（別リポジトリへ）。SSG コアと開発サイクルも
  依存も共有しておらず、lockfile とワークスペースを最も重くしている
- サンプルを `packages/example` に一本化し、`packages/ono/example`・`packages/ono/pages`・
  コミット済みビルド成果物（`output.html` 等）を削除
- REPL 内ハードコードのサンプル3種は、効果が小さいので現状維持でよい（任意で外部ファイル化）

### 維持するもの（判断と理由）

- **barrels 機能**: PR #16 で Content Collections の代替として意図的に導入した直後であり、
  唯一の「コンテンツ列挙」手段なので維持。ただし Phase 1-1 のランタイム統一で
  `loadMeta` のインライン `h` は共通化する
- **`browser/compiler.js`**: REPL の中核であり Node の解決系が使えない環境なので自前実装を維持
- **renderer / jsx-runtime / transformer**: すでに十分小さい（計約200行）

---

## 期待効果

| 指標 | 現状 | 計画後 |
|---|---|---|
| コア src 行数 | 約1,600行 | 約1,000行 |
| コア依存 | typescript, unocss, @unocss/preset-uno, h3, ws | typescript, @unocss/core, @unocss/preset-uno, @unocss/reset |
| 使用ポート | HTTP + WebSocket(35729) | HTTP のみ |
| 既知バグ | Fragment 未定義 / uno.config 無視 / ネストページ衝突 | 0 |
| JSXランタイム定義 | 3箇所（乖離あり） | 1箇所 |
| バンドラ実装 | 2つ | 1つ（ブラウザのみ） |

## 実施順の推奨

1. **Phase 1**（バグ修正を兼ねる。ユーザー影響が最も大きい）
2. **Phase 4**（テスト基盤を整え、以降の安全網にする）
3. **Phase 2** → **Phase 3**（内部リファクタリング。テストで回帰を検知）
4. **Phase 5**（オーナー判断が必要な項目。特に ono-lp 分離）

各フェーズは独立した PR にでき、Phase 3-2（WS→SSE）以外に外部挙動の変更はない。
