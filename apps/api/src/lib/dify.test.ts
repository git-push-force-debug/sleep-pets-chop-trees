import { describe, expect, it, vi } from 'vitest';
import { createDifyClient, DifyRateLimitError } from './dify.ts';

const segment = (content: string, score: number) => ({ segment: { id: 's', content, document: { id: 'd', name: 'x' } }, score });
const rebirthContent =
  '[section:rebirth] [chapter:player-guide] [images:ranch-v7-night]\n### Player guide › Unlock the six ranch tiers\n\nStage 1 costs $280,000.';

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
}

describe('dify.createDataset', () => {
  it('names the Gemini embedding model explicitly instead of the workspace default', async () => {
    const fetchImpl = fakeFetch(200, { id: 'ds9' });
    const dify = createDifyClient({ apiBase: 'https://api.dify.ai/v1', apiKey: 'k1' }, fetchImpl);
    expect(await dify.createDataset('spct-public', { model: 'gemini-embedding-001', provider: 'langgenius/gemini/google' })).toBe('ds9');
    expect(JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body))).toMatchObject({
      name: 'spct-public',
      indexing_technique: 'high_quality',
      embedding_model: 'gemini-embedding-001',
      embedding_model_provider: 'langgenius/gemini/google',
    });
  });
});

describe('dify.retrieve', () => {
  it('posts the hybrid retrieval body with a bearer key', async () => {
    const fetchImpl = fakeFetch(200, { records: [] });
    const dify = createDifyClient({ apiBase: 'https://api.dify.ai/v1', apiKey: 'k1' }, fetchImpl);
    await dify.retrieve('ds1', 'how do I rebirth', 5);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.dify.ai/v1/datasets/ds1/retrieve');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer k1');
    expect(JSON.parse(String(init?.body))).toEqual({
      query: 'how do I rebirth',
      retrieval_model: { search_method: 'hybrid_search', reranking_enable: false, top_k: 5, score_threshold_enabled: false },
    });
  });

  it('maps segment headers to evidence and drops records without a header', async () => {
    const fetchImpl = fakeFetch(200, { records: [segment(rebirthContent, 0.82), segment('no header here', 0.9)] });
    const dify = createDifyClient({ apiBase: 'https://api.dify.ai/v1', apiKey: 'k1' }, fetchImpl);
    expect(await dify.retrieve('ds1', 'q')).toEqual([
      {
        sectionId: 'rebirth',
        chapter: 'player-guide',
        title: 'Unlock the six ranch tiers',
        imageIds: ['ranch-v7-night'],
        content: rebirthContent,
        score: 0.82,
      },
    ]);
  });

  it('throws DifyRateLimitError on HTTP 429', async () => {
    const dify = createDifyClient({ apiBase: 'https://api.dify.ai/v1', apiKey: 'k1' }, fakeFetch(429, { code: 'rate_limit' }));
    await expect(dify.retrieve('ds1', 'q')).rejects.toBeInstanceOf(DifyRateLimitError);
  });
});
