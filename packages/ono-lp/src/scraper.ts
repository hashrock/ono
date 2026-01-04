import { NodeHtmlMarkdown } from "node-html-markdown";

export async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; OnoLP/1.0; +https://github.com/hashrock/ono)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const markdown = NodeHtmlMarkdown.translate(html);

  return markdown;
}
