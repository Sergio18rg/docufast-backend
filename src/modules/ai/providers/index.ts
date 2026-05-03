import { AI_PROVIDERS, DEFAULT_AI_PROVIDER, MESSAGES } from "../constants";
import { createGeminiProvider } from "./gemini.provider";
import { ExtractionProvider } from "./types";

const getExtractionProvider = (): ExtractionProvider => {
  const provider = (
    process.env.AI_PROVIDER || DEFAULT_AI_PROVIDER
  ).toLowerCase();

  if (provider === AI_PROVIDERS.GEMINI) return createGeminiProvider();

  throw new Error(MESSAGES.ERROR.AI_PROVIDER_UNSUPPORTED);
};

export { getExtractionProvider };
