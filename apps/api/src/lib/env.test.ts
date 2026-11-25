import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.ts';

describe('loadEnv', () => {
  it('fails fast and names every missing variable', () => {
    expect(() => loadEnv({ SITE_URL: 'https://site.test' })).toThrow(/SUPABASE_URL.*GEMINI_API_KEY/s);
  });
});
