import { GEMINI_MODEL, MESSAGES } from "../constants";
import {
  buildPrompt,
  normalizeExtractionResponse,
  safeJsonParse,
} from "../utils";
import { ExtractionProvider, ExtractionProviderInput } from "./types";

const createGeminiProvider = (): ExtractionProvider => ({
  async extract({
    entityType,
    documents,
    documentParts,
  }: ExtractionProviderInput) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error(MESSAGES.ERROR.AI_API_KEY_MISSING);

    const prompt = buildPrompt(entityType, documents);

    const ROUTE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;

    const CONTENT_TYPE = "application/json";

    const response = await fetch(ROUTE, {
      method: "POST",
      headers: { "Content-Type": CONTENT_TYPE },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              ...documentParts.map((part) => ({
                inlineData: {
                  mimeType: part.mime_type,
                  data: part.data,
                },
              })),
            ],
          },
        ],
        generationConfig: {
          responseMimeType: CONTENT_TYPE,
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || MESSAGES.ERROR.EXTRACTION_FAILED);
    }

    const result = (await response.json()) as any;
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = safeJsonParse<any>(text || "{}") ?? {};

    return normalizeExtractionResponse(entityType, parsed);
  },
});

export { createGeminiProvider };
