// In-memory test doubles for the API's dependencies.
import { vi } from 'vitest';
import type { Deps } from '../app.ts';
import type { Evidence } from '../lib/dify.ts';
import type { AgentRow, FaqRow, GapRow, MessageRow, SessionRow, Settings, Store } from '../lib/store.ts';

export const SETTINGS: Settings = {
  botEnabled: true,
  greeting: 'Hi!',
  starterQuestions: ['How do I rebirth?'],
  offlineMessage: 'The team will reply soon.',
  evidenceThreshold: 0.3,
  supportHours: 'daily',
};

export function createFakeStore() {
  let n = 0;
  const id = () => `id-${++n}`;
  const now = () => new Date(Date.UTC(2026, 10, 25, 12, 0, n)).toISOString();
  const sessions: SessionRow[] = [];
  const messages: MessageRow[] = [];
  const agents: AgentRow[] = [];
  const contacts = new Map<string, string>();
  const cache = new Map<string, Evidence[]>();
  const hits = new Map<string, number>();
  const gaps: { session_id: string; question: string; top_score: number }[] = [];
  const settings: Settings = { ...SETTINGS };
  const faq: FaqRow[] = [];
  const gapRows: GapRow[] = [];
  const authUsers = new Map<string, string>();

  const store: Store = {
    getAgent: async (userId) => agents.find((a) => a.user_id === userId) ?? null,
    latestSession: async (userId) => [...sessions].reverse().find((s) => s.user_id === userId) ?? null,
    createSession: async (userId, meta) => {
      const row: SessionRow = {
        id: id(), user_id: userId, status: 'bot', bot_paused: false, chatwoot_display_id: null, last_chatwoot_message_id: 0,
        roblox_username: null, email: null, page_url: meta.page_url ?? null, user_agent: meta.user_agent ?? null,
        handoff_at: null, resolved_at: null, created_at: now(), updated_at: now(),
      };
      sessions.push(row);
      return row;
    },
    getSession: async (sid) => sessions.find((s) => s.id === sid) ?? null,
    updateSession: async (sid, patch, onlyIfStatus) => {
      const row = sessions.find((s) => s.id === sid);
      if (!row || (onlyIfStatus && row.status !== onlyIfStatus)) return null;
      Object.assign(row, patch, { updated_at: now() });
      return row;
    },
    listMessages: async (sid) => messages.filter((m) => m.session_id === sid),
    insertMessages: async (rows) => {
      const added: MessageRow[] = [];
      for (const r of rows) {
        if (r.chatwoot_message_id != null && messages.some((m) => m.chatwoot_message_id === r.chatwoot_message_id)) continue;
        const row: MessageRow = {
          id: id(), reply: null, chatwoot_message_id: null, agent_name: null, feedback: null, created_at: now(), ...r,
        };
        messages.push(row);
        added.push(row);
      }
      return added;
    },
    getMessage: async (mid) => messages.find((m) => m.id === mid) ?? null,
    setFeedback: async (mid, value) => {
      const m = messages.find((x) => x.id === mid);
      if (m) m.feedback = value;
    },
    hitRateLimit: async (key, limit) => {
      hits.set(key, (hits.get(key) ?? 0) + 1);
      return hits.get(key)! > limit;
    },
    getSettings: async () => settings,
    cacheGet: async (key) => cache.get(key) ?? null,
    cachePut: async (key, _ds, evidence) => void cache.set(key, evidence),
    addGap: async (gap) => void gaps.push(gap),
    getChatwootContact: async (userId) => (contacts.has(userId) ? { auth_token: contacts.get(userId)! } : null),
    saveChatwootContact: async (userId, token) => void contacts.set(userId, token),
    listSessions: async (statuses, limit) => sessions.filter((s) => statuses.includes(s.status)).slice(0, limit),
    statsData: async () => ({ sessions, messages }),
    messagesForSessions: async (ids) => messages.filter((m) => ids.includes(m.session_id)),
    listFaq: async () => faq,
    createFaq: async (row) => {
      const created: FaqRow = { id: id(), dify_segment_id: null, created_at: now(), updated_at: now(), ...row };
      faq.push(created);
      return created;
    },
    updateFaq: async (fid, patch) => {
      const row = faq.find((x) => x.id === fid);
      return row ? Object.assign(row, patch) : null;
    },
    deleteFaq: async (fid) => {
      const i = faq.findIndex((x) => x.id === fid);
      return i < 0 ? null : faq.splice(i, 1)[0]!;
    },
    listGaps: async () => gapRows.filter((g) => !g.resolved),
    resolveGap: async (gid) => {
      const g = gapRows.find((x) => x.id === gid);
      if (g) g.resolved = true;
    },
    listAgents: async () => agents.map((a) => ({ ...a, email: authUsers.get(a.user_id) ?? null })),
    upsertAgent: async (row) => {
      const i = agents.findIndex((a) => a.user_id === row.user_id);
      if (i >= 0) agents[i] = row;
      else agents.push(row);
    },
    updateAgent: async (userId, patch) => {
      const a = agents.find((x) => x.user_id === userId);
      return a ? Object.assign(a, patch) : null;
    },
    deleteAgent: async (userId) => {
      const i = agents.findIndex((a) => a.user_id === userId);
      if (i >= 0) agents.splice(i, 1);
    },
    createAuthUser: async (email) => {
      const uid = id();
      authUsers.set(uid, email);
      return uid;
    },
    deleteAuthUser: async (userId) => void authUsers.delete(userId),
    saveSettings: async (data) => void Object.assign(settings, data),
  };
  return { store, sessions, messages, agents, gaps, settings, hits, contacts, faq, gapRows, authUsers };
}

export const evidence = (sectionId = 'rebirth', score = 0.74): Evidence => ({
  sectionId,
  chapter: 'player-guide',
  title: 'Unlock the six ranch tiers',
  imageIds: [],
  content: `[section:${sectionId}] [chapter:player-guide] [images:]\n### Player guide › Unlock the six ranch tiers\n\nStage 1 costs $280,000.`,
  score,
});

export const goodAnswer = {
  answer_found: true,
  intent: 'game_question',
  blocks: [{ type: 'table', title: 'Ranch tiers', columns: ['Stage', 'Cash'], rows: [['1', '$280,000']] }],
  suggestions: ['What pet do I need?'],
  used_section_ids: ['rebirth'],
};

/** Tokens look like "user:<id>"; anything else is rejected. */
export function createFakeDeps(over: Partial<Deps> = {}) {
  const fake = createFakeStore();
  const deps: Deps = {
    store: fake.store,
    verifyToken: async (token) => (token.startsWith('user:') ? { userId: token.slice(5) } : null),
    dify: { retrieve: vi.fn(async () => [evidence()]) } as unknown as Deps['dify'],
    gemini: { generate: vi.fn(async (_s, _c, parse) => parse(structuredClone(goodAnswer))) } as unknown as Deps['gemini'],
    chatwoot: {} as Deps['chatwoot'],
    env: {
      SITE_URL: 'https://site.test',
      ADMIN_URL: 'https://admin.test',
      DIFY_PUBLIC_DATASET_ID: 'ds-public',
      DIFY_INTERNAL_DATASET_ID: 'ds-internal',
      DIFY_ADMIN_FAQ_DOCUMENT_ID: 'doc-faq',
      CHATWOOT_ACCOUNT_ID: '1',
    } as Deps['env'],
    guideImages: {},
    guideZh: { images: {}, titles: {}, glossary: {} },
    ...over,
  };
  return { deps, ...fake };
}
