import { geminiResponseSchema } from '../../../../packages/shared/src/blocks.ts';

export interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export class GeminiUnavailableError extends Error {
  constructor() {
    super('Gemini is unavailable');
  }
}

export type GeminiClient = ReturnType<typeof createGeminiClient>;

// Plain REST call (the request shape was verified live); tries the primary model, then the fallback.
// Vercel stops the function at 30 s and Dify can use up to 15 s first, so both models share one 20 s budget.
const BUDGET_MS = 20_000;
const FIRST_TRY_MS = 12_000;

export function createGeminiClient(
  cfg: { apiKey: string; model: string; fallbackModel: string; budgetMs?: number },
  fetchImpl: typeof fetch = fetch,
) {
  const schema = geminiResponseSchema();

  return {
    async generate<T>(system: string, contents: GeminiContent[], parse: (raw: unknown) => T | null): Promise<T> {
      const budget = cfg.budgetMs ?? BUDGET_MS;
      const deadline = Date.now() + budget;
      for (const [i, model] of [cfg.model, cfg.fallbackModel].entries()) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        try {
          const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'x-goog-api-key': cfg.apiKey, 'content-type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents,
              generationConfig: {
                temperature: 0.3,
                responseMimeType: 'application/json',
                responseJsonSchema: schema,
                thinkingConfig: { thinkingLevel: 'minimal' },
              },
            }),
            signal: AbortSignal.timeout(i === 0 ? Math.min(remaining, Math.round(budget * (FIRST_TRY_MS / BUDGET_MS))) : remaining),
          });
          if (!res.ok) continue;
          const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
          const parsed = parse(JSON.parse(text));
          if (parsed) return parsed;
        } catch {
          // network error, timeout or malformed JSON: try the next model
        }
      }
      throw new GeminiUnavailableError();
    },
  };
}
