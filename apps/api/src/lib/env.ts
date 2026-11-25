import { z } from 'zod';

const required = z.string().min(1);
const url = z.string().url();

const EnvSchema = z.object({
  SUPABASE_URL: url,
  SUPABASE_SECRET_KEY: required,
  GEMINI_API_KEY: required,
  GEMINI_MODEL: required,
  GEMINI_FALLBACK_MODEL: required,
  DIFY_API_BASE: url,
  DIFY_DATASET_API_KEY: required,
  DIFY_PUBLIC_DATASET_ID: required,
  DIFY_INTERNAL_DATASET_ID: required,
  DIFY_ADMIN_FAQ_DOCUMENT_ID: required,
  CHATWOOT_BASE_URL: url,
  CHATWOOT_WEBSITE_TOKEN: required,
  CHATWOOT_ACCOUNT_ID: required,
  SITE_URL: url,
  ADMIN_URL: url,
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => String(i.path[0])))];
    throw new Error(`Missing or invalid environment variables: ${names.join(', ')}`);
  }
  return result.data;
}
