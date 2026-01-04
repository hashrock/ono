# @hashrock/ono-lp

LLM-powered landing page generator for Ono.

## Install

```bash
npm install
npm run build
```

## Usage

```bash
# Generate with Claude (default)
npx ono-lp https://example.com

# Specify model
npx ono-lp https://example.com -m openai
npx ono-lp https://example.com -m gemini

# Custom output directory
npx ono-lp https://example.com -d ./my-output
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...     # Claude
OPENAI_API_KEY=sk-...            # OpenAI
GOOGLE_GENERATIVE_AI_API_KEY=... # Gemini
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --model` | AI provider (claude, openai, gemini) | claude |
| `-d, --outdir` | Output directory | ./output |
| `-s, --screenshot` | Reference image for design | - |
