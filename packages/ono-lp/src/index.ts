#!/usr/bin/env node

import "dotenv/config";
import { program } from "commander";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { scrapeUrl } from "./scraper.js";
import { getModel, type ModelProvider } from "./providers.js";
import { generateLP, type GeneratedFile } from "./generator.js";

interface Options {
  model: string;
  outdir: string;
  screenshot?: string;
}

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "image/png";
}

program
  .name("ono-lp")
  .description("Generate ONO-style landing pages from URLs using LLMs")
  .argument("<url>", "URL to scrape")
  .option(
    "-m, --model <provider>",
    "AI model provider (claude, openai, gemini)",
    "claude"
  )
  .option("-d, --outdir <path>", "Output base directory", "./output")
  .option("-s, --screenshot <path>", "Reference screenshot image path")
  .action(async (url: string, options: Options) => {
    const provider = options.model as ModelProvider;

    if (!["claude", "openai", "gemini"].includes(provider)) {
      console.error(`Error: Invalid model provider "${provider}"`);
      console.error("Valid providers: claude, openai, gemini");
      process.exit(1);
    }

    try {
      console.log(`Fetching ${url}...`);
      const content = await scrapeUrl(url);

      // Load screenshot if provided
      let screenshot: { data: Buffer; mimeType: string } | undefined;
      if (options.screenshot) {
        console.log(`Loading screenshot: ${options.screenshot}`);
        const imageData = await readFile(options.screenshot);
        screenshot = {
          data: imageData,
          mimeType: getMimeType(options.screenshot),
        };
      }

      console.log(`Generating LP with ${provider}...\n`);
      const model = getModel(provider);

      const onFileGenerated = async (file: GeneratedFile) => {
        const filePath = join(options.outdir, file.path);
        const fileDir = dirname(filePath);
        await mkdir(fileDir, { recursive: true });
        await writeFile(filePath, file.content, "utf-8");
        console.log(`  ✓ ${file.path}`);
      };

      const result = await generateLP(model, content, screenshot, onFileGenerated);

      console.log(`\nGenerated ${result.files.length} file(s). Done!`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
