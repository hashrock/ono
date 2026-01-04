# @hashrock/ono-lp

Ono用のLLM搭載ランディングページジェネレーター。

## インストール

```bash
npm install
npm run build
```

## 使い方

```bash
# Claude（デフォルト）で生成
npx ono-lp https://example.com

# モデルを指定
npx ono-lp https://example.com -m openai
npx ono-lp https://example.com -m gemini

# カスタム出力ディレクトリ
npx ono-lp https://example.com -d ./my-output
```

## 環境変数

```bash
ANTHROPIC_API_KEY=sk-ant-...     # Claude
OPENAI_API_KEY=sk-...            # OpenAI
GOOGLE_GENERATIVE_AI_API_KEY=... # Gemini
```

## オプション

| オプション | 説明 | デフォルト |
|--------|-------------|---------|
| `-m, --model` | AIプロバイダー（claude, openai, gemini） | claude |
| `-d, --outdir` | 出力ディレクトリ | ./output |
| `-s, --screenshot` | デザイン用参照画像 | - |
