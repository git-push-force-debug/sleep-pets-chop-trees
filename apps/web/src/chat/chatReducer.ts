import type { ChatMessage, ChatSession } from '../../../../packages/shared/src/api.ts';

export interface ChatState {
  ready: boolean;
  session: ChatSession | null;
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  /** Bot message ids that arrived in this visit and should play their entrance. */
  fresh: string[];
}

export type ChatAction =
  | { type: 'loaded'; session: ChatSession; messages: ChatMessage[] }
  | { type: 'sending' }
  | { type: 'sent'; messages: ChatMessage[] }
  | { type: 'received'; message: ChatMessage }
  | { type: 'status'; session: ChatSession }
  | { type: 'played'; id: string }
  | { type: 'failed'; error: string }
  | { type: 'clearError' };

export const initialChat: ChatState = { ready: false, session: null, messages: [], sending: false, error: null, fresh: [] };

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'loaded':
      return { ...state, ready: true, session: action.session, messages: merge([], action.messages), error: null, fresh: [] };
    case 'sending':
      return { ...state, sending: true, error: null };
    case 'sent': {
      const known = new Set(state.messages.map((m) => m.id));
      const freshBots = action.messages.filter((m) => m.role === 'bot' && !known.has(m.id)).map((m) => m.id);
      return { ...state, sending: false, messages: merge(state.messages, action.messages), fresh: [...state.fresh, ...freshBots] };
    }
    case 'received':
      return { ...state, messages: merge(state.messages, [action.message]) };
    case 'status':
      return { ...state, session: action.session };
    case 'played':
      return { ...state, fresh: state.fresh.filter((id) => id !== action.id) };
    case 'failed':
      return { ...state, sending: false, error: action.error };
    case 'clearError':
      return { ...state, error: null };
  }
}

const FRIENDLY = new Set([400, 404, 409, 502]);

export function errorMessage(status: number, body: { error?: string; retryAfterSeconds?: number } | null): string {
  if (status === 429) return `You're sending messages fast — try again in ${body?.retryAfterSeconds ?? 60} s.`;
  if (FRIENDLY.has(status) && body?.error) return body.error;
  if (status === 0) return "You're offline. Check your connection and try again.";
  return 'Something went wrong. Please try again.';
}
