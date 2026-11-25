import { SEGMENT_HEADER_RE } from '../../../../packages/shared/src/guide.ts';

export interface Evidence {
  sectionId: string;
  chapter: string;
  title: string;
  imageIds: string[];
  content: string;
  score: number;
}

export class DifyRateLimitError extends Error {
  constructor() {
    super('Dify rate limit reached');
  }
}

export type DifyClient = ReturnType<typeof createDifyClient>;

const TITLE_RE = /^### .*? › (.+)$/m;

export function toEvidence(content: string, score: number): Evidence | null {
  const header = content.match(SEGMENT_HEADER_RE);
  if (!header) return null;
  return {
    sectionId: header[1]!,
    chapter: header[2]!,
    title: content.match(TITLE_RE)?.[1]?.trim() ?? header[1]!,
    imageIds: header[3]!.split(',').filter(Boolean),
    content,
    score,
  };
}

export function createDifyClient(cfg: { apiBase: string; apiKey: string }, fetchImpl: typeof fetch = fetch) {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetchImpl(`${cfg.apiBase}${path}`, {
      method,
      headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 429) throw new DifyRateLimitError();
    const text = await res.text();
    if (!res.ok) throw new Error(`Dify ${method} ${path} → HTTP ${res.status} ${text.slice(0, 200)}`);
    return (text ? JSON.parse(text) : {}) as T;
  }

  return {
    async retrieve(datasetId: string, query: string, topK = 5): Promise<Evidence[]> {
      const data = await call<{ records?: { segment: { content: string }; score: number }[] }>(
        'POST',
        `/datasets/${datasetId}/retrieve`,
        {
          query,
          retrieval_model: { search_method: 'hybrid_search', reranking_enable: false, top_k: topK, score_threshold_enabled: false },
        },
      );
      return (data.records ?? []).flatMap((r) => toEvidence(r.segment.content, r.score) ?? []);
    },

    async listDatasets(): Promise<{ id: string; name: string }[]> {
      return (await call<{ data: { id: string; name: string }[] }>('GET', '/datasets?page=1&limit=100')).data;
    },

    // The embedding model is named explicitly: the workspace default may be a provider without quota.
    async createDataset(name: string, embedding: { model: string; provider: string }): Promise<string> {
      return (
        await call<{ id: string }>('POST', '/datasets', {
          name,
          permission: 'only_me',
          indexing_technique: 'high_quality',
          embedding_model: embedding.model,
          embedding_model_provider: embedding.provider,
        })
      ).id;
    },

    async deleteDataset(datasetId: string): Promise<void> {
      await call('DELETE', `/datasets/${datasetId}`);
    },

    async listDocuments(datasetId: string): Promise<{ id: string; name: string }[]> {
      return (await call<{ data: { id: string; name: string }[] }>('GET', `/datasets/${datasetId}/documents?page=1&limit=100`)).data;
    },

    async deleteDocument(datasetId: string, documentId: string): Promise<void> {
      await call('DELETE', `/datasets/${datasetId}/documents/${documentId}`);
    },

    async createDocumentByText(datasetId: string, name: string, text: string): Promise<string> {
      const data = await call<{ document: { id: string } }>('POST', `/datasets/${datasetId}/document/create-by-text`, {
        name,
        text,
        indexing_technique: 'high_quality',
        process_rule: {
          mode: 'custom',
          rules: {
            pre_processing_rules: [{ id: 'remove_extra_spaces', enabled: true }],
            segmentation: { separator: '=====', max_tokens: 2000 },
          },
        },
      });
      return data.document.id;
    },

    async addSegment(datasetId: string, documentId: string, content: string): Promise<string> {
      const data = await call<{ data: { id: string }[] }>('POST', `/datasets/${datasetId}/documents/${documentId}/segments`, {
        segments: [{ content }],
      });
      return data.data[0]!.id;
    },

    async updateSegment(datasetId: string, documentId: string, segmentId: string, content: string): Promise<void> {
      await call('POST', `/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`, { segment: { content } });
    },

    async deleteSegment(datasetId: string, documentId: string, segmentId: string): Promise<void> {
      await call('DELETE', `/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`);
    },
  };
}
