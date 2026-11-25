import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { BotReply } from '../../../../packages/shared/src/blocks.ts';
import type { PublicSettings, SessionStatus } from '../../../../packages/shared/src/api.ts';
import type { Evidence } from './dify.ts';

export interface SessionRow {
  id: string;
  user_id: string;
  status: SessionStatus;
  bot_paused: boolean;
  chatwoot_display_id: number | null;
  last_chatwoot_message_id: number;
  roblox_username: string | null;
  email: string | null;
  page_url: string | null;
  user_agent: string | null;
  handoff_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'bot' | 'agent' | 'system';
  content: string;
  reply: BotReply | null;
  chatwoot_message_id: number | null;
  agent_name: string | null;
  feedback: 1 | -1 | null;
  created_at: string;
}

export type NewMessage = Pick<MessageRow, 'session_id' | 'role' | 'content'> &
  Partial<Pick<MessageRow, 'reply' | 'chatwoot_message_id' | 'agent_name'>>;

export interface Settings extends PublicSettings {
  evidenceThreshold: number;
  supportHours: string;
}

export interface AgentRow {
  user_id: string;
  role: 'admin' | 'agent';
  display_name: string;
}

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  dify_segment_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GapRow {
  id: string;
  session_id: string | null;
  question: string;
  top_score: number | null;
  resolved: boolean;
  created_at: string;
}

export interface Store {
  getAgent(userId: string): Promise<AgentRow | null>;
  /** The user's newest chat, resolved or not (a returning player sees how their ticket ended). */
  latestSession(userId: string): Promise<SessionRow | null>;
  createSession(userId: string, meta: { page_url?: string | null; user_agent?: string | null }): Promise<SessionRow>;
  getSession(id: string): Promise<SessionRow | null>;
  /** Conditional update: returns null when `onlyIfStatus` is given and the row no longer has that status. */
  updateSession(id: string, patch: Partial<SessionRow>, onlyIfStatus?: SessionStatus): Promise<SessionRow | null>;
  listMessages(sessionId: string): Promise<MessageRow[]>;
  /** Rows whose chatwoot_message_id already exists are skipped. */
  insertMessages(rows: NewMessage[]): Promise<MessageRow[]>;
  getMessage(id: string): Promise<MessageRow | null>;
  setFeedback(id: string, value: 1 | -1): Promise<void>;
  hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
  getSettings(): Promise<Settings>;
  cacheGet(key: string): Promise<Evidence[] | null>;
  cachePut(key: string, datasetId: string, evidence: Evidence[]): Promise<void>;
  addGap(gap: { session_id: string; question: string; top_score: number }): Promise<void>;
  getChatwootContact(userId: string): Promise<{ auth_token: string } | null>;
  saveChatwootContact(userId: string, authToken: string, sourceId: string): Promise<void>;
  // Admin
  listSessions(statuses: SessionStatus[], limit: number): Promise<SessionRow[]>;
  statsData(fromIso: string, toIso: string): Promise<{ sessions: SessionRow[]; messages: MessageRow[] }>;
  listFaq(): Promise<FaqRow[]>;
  createFaq(row: Pick<FaqRow, 'question' | 'answer' | 'created_by'>): Promise<FaqRow>;
  updateFaq(id: string, patch: Partial<Pick<FaqRow, 'question' | 'answer' | 'dify_segment_id'>>): Promise<FaqRow | null>;
  deleteFaq(id: string): Promise<FaqRow | null>;
  listGaps(): Promise<GapRow[]>;
  resolveGap(id: string): Promise<void>;
  listAgents(): Promise<(AgentRow & { email: string | null })[]>;
  upsertAgent(row: AgentRow): Promise<void>;
  updateAgent(userId: string, patch: Partial<Pick<AgentRow, 'role' | 'display_name'>>): Promise<AgentRow | null>;
  deleteAgent(userId: string): Promise<void>;
  /** Creates a confirmed email+password user; returns its id. */
  createAuthUser(email: string, password: string): Promise<string>;
  deleteAuthUser(userId: string): Promise<void>;
  saveSettings(data: Settings): Promise<void>;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function createSupabaseStore(db: SupabaseClient): Store {
  const one = async <T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> => {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data;
  };

  return {
    getAgent: (userId) => one(db.from('agents').select('user_id, role, display_name').eq('user_id', userId).maybeSingle()),
    latestSession: (userId) =>
      one(db.from('chat_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()),
    createSession: async (userId, meta) =>
      (await one(db.from('chat_sessions').insert({ user_id: userId, ...meta }).select('*').single()))!,
    getSession: (id) => one(db.from('chat_sessions').select('*').eq('id', id).maybeSingle()),
    updateSession: (id, patch, onlyIfStatus) => {
      let q = db.from('chat_sessions').update(patch).eq('id', id);
      if (onlyIfStatus) q = q.eq('status', onlyIfStatus);
      return one(q.select('*').maybeSingle());
    },
    listMessages: async (sessionId) =>
      (await one(db.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }))) ?? [],
    insertMessages: async (rows) =>
      rows.length
        ? ((await one(
            db.from('messages').upsert(rows, { onConflict: 'chatwoot_message_id', ignoreDuplicates: true }).select('*'),
          )) ?? [])
        : [],
    getMessage: (id) => one(db.from('messages').select('*').eq('id', id).maybeSingle()),
    setFeedback: async (id, value) => {
      await one(db.from('messages').update({ feedback: value }).eq('id', id));
    },
    hitRateLimit: async (key, limit, windowSeconds) => {
      const { data, error } = await db.rpc('hit_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
      if (error) throw new Error(error.message);
      return data as boolean;
    },
    getSettings: async () => (await one(db.from('settings').select('data').eq('id', 1).single<{ data: Settings }>()))!.data,
    cacheGet: async (key) => {
      const row = await one(db.from('retrieval_cache').select('evidence, expires_at').eq('key', key).maybeSingle());
      return row && new Date(row.expires_at as string).getTime() > Date.now() ? (row.evidence as Evidence[]) : null;
    },
    cachePut: async (key, datasetId, evidence) => {
      await one(
        db.from('retrieval_cache').upsert({ key, dataset_id: datasetId, evidence, expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString() }),
      );
    },
    addGap: async (gap) => {
      await one(db.from('bot_gaps').insert(gap));
    },
    getChatwootContact: (userId) => one(db.from('chatwoot_contacts').select('auth_token').eq('user_id', userId).maybeSingle()),
    saveChatwootContact: async (userId, authToken, sourceId) => {
      await one(db.from('chatwoot_contacts').upsert({ user_id: userId, auth_token: authToken, source_id: sourceId }));
    },
    listSessions: async (statuses, limit) =>
      (await one(db.from('chat_sessions').select('*').in('status', statuses).order('updated_at', { ascending: false }).limit(limit))) ?? [],
    statsData: async (fromIso, toIso) => {
      const sessions =
        (await one(db.from('chat_sessions').select('*').gte('created_at', fromIso).lt('created_at', toIso).limit(5000))) ?? [];
      const ids = (sessions as SessionRow[]).map((x) => x.id);
      const messages = ids.length
        ? ((await one(db.from('messages').select('*').in('session_id', ids).in('role', ['bot', 'agent']).limit(20000))) ?? [])
        : [];
      return { sessions: sessions as SessionRow[], messages: messages as MessageRow[] };
    },
    listFaq: async () => (await one(db.from('faq_entries').select('*').order('created_at', { ascending: false }))) ?? [],
    createFaq: async (row) => (await one(db.from('faq_entries').insert(row).select('*').single()))!,
    updateFaq: (id, patch) => one(db.from('faq_entries').update(patch).eq('id', id).select('*').maybeSingle()),
    deleteFaq: (id) => one(db.from('faq_entries').delete().eq('id', id).select('*').maybeSingle()),
    listGaps: async () =>
      (await one(db.from('bot_gaps').select('*').eq('resolved', false).order('created_at', { ascending: false }).limit(200))) ?? [],
    resolveGap: async (id) => {
      await one(db.from('bot_gaps').update({ resolved: true }).eq('id', id));
    },
    listAgents: async () => {
      const agents = ((await one(db.from('agents').select('user_id, role, display_name').order('created_at'))) ?? []) as AgentRow[];
      const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
      const emails = new Map((data?.users ?? []).map((u) => [u.id, u.email ?? null]));
      return agents.map((a) => ({ ...a, email: emails.get(a.user_id) ?? null }));
    },
    upsertAgent: async (row) => {
      await one(db.from('agents').upsert(row));
    },
    updateAgent: (userId, patch) =>
      one(db.from('agents').update(patch).eq('user_id', userId).select('user_id, role, display_name').maybeSingle()),
    deleteAgent: async (userId) => {
      await one(db.from('agents').delete().eq('user_id', userId));
    },
    createAuthUser: async (email, password) => {
      const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) throw new Error(error?.message ?? 'could not create user');
      return data.user.id;
    },
    deleteAuthUser: async (userId) => {
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
    saveSettings: async (data) => {
      await one(db.from('settings').update({ data }).eq('id', 1));
    },
  };
}

export const createServiceClient = (url: string, secretKey: string) =>
  // supabase-js needs a WebSocket class at construction; Node 20 has none built in (the server never uses realtime).
  createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });
