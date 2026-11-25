import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ChatMessage, ChatSession, PublicSettings } from '../../../../packages/shared/src/api.ts';
import type { BotReply } from '../../../../packages/shared/src/blocks.ts';
import { api, ApiError, supabase } from './api.ts';
import { chatReducer, initialChat, type ChatState } from './chatReducer.ts';

const POLL_MS = 5000; // free Chatwoot plan: no webhooks, so agent replies are polled while a person handles the chat

export interface HandoffForm {
  robloxUsername: string;
  email: string;
  summary: string;
}

export interface Chat {
  state: ChatState & { fresh: string[] };
  settings: PublicSettings | null;
  send(text: string): Promise<void>;
  handoff(form: HandoffForm): Promise<boolean>;
  startNew(): Promise<void>;
  feedback(messageId: string, value: 1 | -1): Promise<void>;
}

type MessageRow = { id: string; session_id: string; role: ChatMessage['role']; content: string; reply: BotReply | null; agent_name: string | null; created_at: string; feedback: 1 | -1 | null };
type SessionRow = { id: string; status: ChatSession['status']; bot_paused: boolean; chatwoot_display_id: number | null; created_at: string };

const fromRow = (m: MessageRow): ChatMessage => ({
  id: m.id, role: m.role, content: m.content, reply: m.reply, agentName: m.agent_name, createdAt: m.created_at, feedback: m.feedback,
});
const sessionFromRow = (s: SessionRow): ChatSession => ({
  id: s.id, status: s.status, botPaused: s.bot_paused, ticket: s.chatwoot_display_id, createdAt: s.created_at,
});

export function useChat(enabled: boolean): Chat {
  const [state, dispatch] = useReducer(chatReducer, initialChat);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const started = useRef(false);
  const sessionId = state.session?.id;
  const status = state.session?.status;

  const fail = (error: unknown) => dispatch({ type: 'failed', error: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.' });

  // The API returns the newest open session, or creates one (so after a resolved chat this starts a new one).
  const load = useCallback(async (fresh = false) => {
    try {
      const created = await api<{ session: ChatSession }>('/chat/sessions', { method: 'POST', body: { pageUrl: location.pathname, fresh } });
      const full = await api<{ session: ChatSession; messages: ChatMessage[] }>(`/chat/sessions/${created.session.id}`);
      dispatch({ type: 'loaded', session: full.session, messages: full.messages });
    } catch (error) {
      fail(error);
    }
  }, []);

  // Start lazily: the first time the chat opens.
  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    fetch(`${import.meta.env.VITE_API_URL}/chat/settings`).then((r) => r.json()).then(setSettings).catch(() => {});
    void load();
  }, [enabled, load]);

  // Realtime: new messages (agent replies, our own inserts) and status changes for this session only (RLS-scoped).
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` }, (p) =>
        dispatch({ type: 'received', message: fromRow(p.new as MessageRow) }),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_sessions', filter: `id=eq.${sessionId}` }, (p) =>
        dispatch({ type: 'status', session: sessionFromRow(p.new as SessionRow) }),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [sessionId]);

  // Poll Chatwoot (via our API) while a person is involved and the page is visible.
  useEffect(() => {
    if (!sessionId || (status !== 'waiting_human' && status !== 'human')) return;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await api<{ session: ChatSession; added: number }>(`/chat/sessions/${sessionId}/sync`, { method: 'POST' });
        dispatch({ type: 'status', session: res.session });
        if (res.added) {
          const full = await api<{ session: ChatSession; messages: ChatMessage[] }>(`/chat/sessions/${sessionId}`);
          full.messages.forEach((message) => dispatch({ type: 'received', message }));
        }
      } catch {
        // transient: the next tick retries
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [sessionId, status]);

  const send = useCallback(async (text: string) => {
    if (!sessionId) return;
    dispatch({ type: 'sending' });
    try {
      const res = await api<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`, { method: 'POST', body: { text } });
      dispatch({ type: 'sent', messages: res.messages });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const full = await api<{ session: ChatSession; messages: ChatMessage[] }>(`/chat/sessions/${sessionId}`).catch(() => null);
        if (full) dispatch({ type: 'loaded', session: full.session, messages: full.messages });
      }
      fail(error);
    }
  }, [sessionId]);

  const handoff = useCallback(async (form: HandoffForm) => {
    if (!sessionId) return false;
    dispatch({ type: 'sending' });
    try {
      const res = await api<{ session: ChatSession }>(`/chat/sessions/${sessionId}/handoff`, { method: 'POST', body: form });
      dispatch({ type: 'status', session: res.session });
      const full = await api<{ session: ChatSession; messages: ChatMessage[] }>(`/chat/sessions/${sessionId}`);
      dispatch({ type: 'sent', messages: full.messages });
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  }, [sessionId]);

  const startNew = useCallback(() => load(true), [load]);

  const feedback = useCallback(async (messageId: string, value: 1 | -1) => {
    try {
      await api(`/chat/messages/${messageId}/feedback`, { method: 'POST', body: { value } });
    } catch {
      // feedback is best-effort
    }
  }, []);

  return { state, settings, send, handoff, startNew, feedback };
}
