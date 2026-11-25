import { describe, expect, it, vi } from 'vitest';
import { createGeminiClient, GeminiUnavailableError } from './gemini.ts';

const cfg = { apiKey: 'g1', model: 'primary-lite', fallbackModel: 'fallback-flash' };
const ok = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }));
const parseOk = (raw: unknown) => ((raw as { ok?: boolean }).ok ? (raw as { ok: boolean }) : null);

describe('gemini client', () => {
  it('uses the primary model when it answers', async () => {
    const f = vi.fn(async () => ok({ ok: true }));
    expect(await createGeminiClient(cfg, f).generate('sys', [], parseOk)).toEqual({ ok: true });
    expect(String(f.mock.calls[0]![0])).toContain('/models/primary-lite:generateContent');
    expect(new Headers((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).get('x-goog-api-key')).toBe('g1');
  });

  it('falls back when the primary is overloaded or returns an invalid answer', async () => {
    const overloaded = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(ok({ ok: true }));
    expect(await createGeminiClient(cfg, overloaded).generate('sys', [], parseOk)).toEqual({ ok: true });
    expect(String(overloaded.mock.calls[1]![0])).toContain('/models/fallback-flash:');

    const invalid = vi.fn().mockResolvedValueOnce(ok({ ok: false })).mockResolvedValueOnce(ok({ ok: true }));
    expect(await createGeminiClient(cfg, invalid).generate('sys', [], parseOk)).toEqual({ ok: true });
  });

  it('throws GeminiUnavailableError when both models fail', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 503 }));
    await expect(createGeminiClient(cfg, f).generate('sys', [], parseOk)).rejects.toBeInstanceOf(GeminiUnavailableError);
  });
});
