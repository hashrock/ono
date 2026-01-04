# ono-lp

URLからONO SSG形式のランディングページを自動生成するCLIツール。LLM（Claude / OpenAI / Gemini）を使用してWebページの内容を分析し、コンポーネント分離されたJSXファイルを生成します。

## インストール

```bash
npm install
npm run build
```

## 環境変数

`.env.example`を参考に`.env`ファイルを作成し、使用するLLMのAPIキーを設定してください。

```bash
# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...

# Gemini (Google)
GOOGLE_GENERATIVE_AI_API_KEY=AI...
```

## 使い方

```bash
# 基本的な使い方（デフォルトでClaude使用）
npx ono-lp https://example.com

# モデルを指定
npx ono-lp https://example.com -m openai
npx ono-lp https://example.com -m gemini

# 出力先ディレクトリを指定（デフォルト: ./output）
npx ono-lp https://example.com -d ./my-output

# スクリーンショットを参考にデザインを生成
npx ono-lp https://example.com -s ./reference.png
```

## オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `-m, --model <provider>` | AIモデル（claude, openai, gemini） | claude |
| `-d, --outdir <path>` | 出力ディレクトリ | ./output |
| `-s, --screenshot <path>` | 参考画像（デザインの参考に使用） | - |

## 出力

以下のような構造でファイルが生成されます：

```
output/
├── components/
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Hero.jsx
│   └── ...
└── pages/
    └── index.jsx
```

生成されたファイルは[ONO SSG](https://github.com/hashrock/ono)でビルドできます：

```bash
npx ono build pages/
```

## 依存関係

- [@ai-sdk/anthropic](https://www.npmjs.com/package/@ai-sdk/anthropic) - Claude API
- [@ai-sdk/openai](https://www.npmjs.com/package/@ai-sdk/openai) - OpenAI API
- [@ai-sdk/google](https://www.npmjs.com/package/@ai-sdk/google) - Gemini API
- [ai](https://www.npmjs.com/package/ai) - Vercel AI SDK
- [commander](https://www.npmjs.com/package/commander) - CLI引数パーサー
