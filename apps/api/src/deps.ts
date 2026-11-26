import guide from '../../../content/guide.public.json' with { type: 'json' };
import guideZh from '../../../content/guide.public.zh.json' with { type: 'json' };
import type { Guide } from '../../../packages/shared/src/guide.ts';
import type { Deps } from './app.ts';
import { supabaseVerifier } from './lib/auth.ts';
import { createChatwootClient } from './lib/chatwoot.ts';
import { createDifyClient } from './lib/dify.ts';
import { loadEnv, type Env } from './lib/env.ts';
import { createGeminiClient } from './lib/gemini.ts';
import { createServiceClient, createSupabaseStore } from './lib/store.ts';

export function createDeps(env: Env = loadEnv()): Deps {
  const db = createServiceClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  return {
    store: createSupabaseStore(db),
    verifyToken: supabaseVerifier(db),
    dify: createDifyClient({ apiBase: env.DIFY_API_BASE, apiKey: env.DIFY_DATASET_API_KEY }),
    gemini: createGeminiClient({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, fallbackModel: env.GEMINI_FALLBACK_MODEL }),
    chatwoot: createChatwootClient({ baseUrl: env.CHATWOOT_BASE_URL, websiteToken: env.CHATWOOT_WEBSITE_TOKEN }),
    env,
    guideImages: (guide as Guide).images,
    guideZh: {
      images: (guideZh as Guide).images,
      titles: Object.fromEntries((guideZh as Guide).chapters.flatMap((c) => c.sections.map((s) => [s.id, s.title]))),
    },
  };
}
