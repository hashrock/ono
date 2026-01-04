import { generateText, tool } from "ai";
import { z } from "zod";

const SYSTEM_PROMPT = `あなたはONO SSGのエキスパートです。与えられたウェブページの内容を分析し、魅力的なランディングページをONO形式のJSXで生成してください。

## ONO SSGについて
Onoは最小限のJSX静的サイトジェネレーター。

## コンポーネント設計
再利用可能なコンポーネントに分離してください：
- Button.jsx - ボタン
- Card.jsx - カード
- Nav.jsx - ナビゲーション
- Hero.jsx - ヒーローセクション
- Footer.jsx - フッター
等

## 重要なルール
- class属性を使用（classNameではない）
- UnoCSS/Tailwindのユーティリティクラスを使用
- @jsxImportSourceは使用しない
- importは相対パス + .jsx拡張子
- pages/index.jsxの<head>には必ず<link rel="stylesheet" href="/uno.css" />を含める

## ファイル生成
writeFileツールを使って、1ファイルずつ生成してください。
まずコンポーネントを生成し、最後にpages/index.jsxを生成してください。`;

export interface Screenshot {
  data: Buffer;
  mimeType: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateResult {
  files: GeneratedFile[];
}

export async function generateLP(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  content: string,
  screenshot?: Screenshot,
  onFileGenerated?: (file: GeneratedFile) => void
): Promise<GenerateResult> {
  const files: GeneratedFile[] = [];

  const writeFileTool = tool({
    description: "JSXファイルを生成する",
    parameters: z.object({
      path: z.string().describe("ファイルパス（例: components/Button.jsx, pages/index.jsx）"),
      content: z.string().describe("ファイルの内容（JSXコード）"),
    }),
    execute: async ({ path, content }) => {
      const file = { path, content };
      files.push(file);
      onFileGenerated?.(file);
      return `${path} を生成しました`;
    },
  });

  const textPrompt = `ウェブページ内容:
---
${content}
---

上記を元に、コンポーネントを分離してLPを生成してください。writeFileツールを使って1ファイルずつ生成してください。`;

  if (screenshot) {
    await generateText({
      model,
      maxTokens: 16000,
      tools: { writeFile: writeFileTool },
      maxSteps: 20,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image",
              image: screenshot.data,
              mimeType: screenshot.mimeType,
            },
            {
              type: "text",
              text: `このスクリーンショットのデザインを参考に、以下の内容でLPを生成してください。\n\n${textPrompt}`,
            },
          ],
        },
      ],
    });
  } else {
    await generateText({
      model,
      maxTokens: 16000,
      tools: { writeFile: writeFileTool },
      maxSteps: 20,
      system: SYSTEM_PROMPT,
      prompt: textPrompt,
    });
  }

  return { files };
}
