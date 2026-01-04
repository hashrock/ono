import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type ModelProvider = "claude" | "openai" | "gemini";

const DEFAULT_MODELS: Record<ModelProvider, string> = {
  claude: "claude-opus-4-5-20251101",
  openai: "gpt-5",
  gemini: "gemini-3-pro-preview",
};

export function getModel(provider: ModelProvider) {
  switch (provider) {
    case "claude": {
      const anthropic = createAnthropic();
      return anthropic(DEFAULT_MODELS.claude);
    }
    case "openai": {
      const openai = createOpenAI();
      return openai(DEFAULT_MODELS.openai);
    }
    case "gemini": {
      const google = createGoogleGenerativeAI();
      return google(DEFAULT_MODELS.gemini);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
