import { describe, expect, it } from 'vitest';
import type { ChatMessage, ChatSession } from '../../../../packages/shared/src/api.ts';
import { chatReducer, errorMessage, initialChat } from './chatReducer.ts';

const session: ChatSession = { id: 's1', status: 'bot', botPaused: false, ticket: null, createdAt: '2026-11-25T10:00:00Z' };
const msg = (id: string, role: ChatMessage['role'], createdAt: string): ChatMessage => ({
  id, role, content: id, reply: null, agentName: null, createdAt, feedback: null,
});

describe('chatReducer', () => {
  it('keeps one copy of a message received twice (realtime + response)', () => {
    let s = chatReducer(initialChat, { type: 'loaded', session, messages: [] });
    s = chatReducer(s, { type: 'received', message: msg('m1', 'agent', '2026-11-25T10:01:00Z') });
    s = chatReducer(s, { type: 'received', message: msg('m1', 'agent', '2026-11-25T10:01:00Z') });
    expect(s.messages.map((m) => m.id)).toEqual(['m1']);
  });

  it('keeps messages in time order and marks new bot replies to animate', () => {
    let s = chatReducer(initialChat, { type: 'loaded', session, messages: [msg('old', 'bot', '2026-11-25T10:00:30Z')] });
    s = chatReducer(s, { type: 'sending' });
    expect(s.sending).toBe(true);
    s = chatReducer(s, { type: 'sent', messages: [msg('b', 'bot', '2026-11-25T10:02:00Z'), msg('u', 'user', '2026-11-25T10:01:59Z')] });
    expect(s.messages.map((m) => m.id)).toEqual(['old', 'u', 'b']);
    expect(s.fresh).toEqual(['b']);
    expect(s.sending).toBe(false);
  });

  it('updates the session status', () => {
    let s = chatReducer(initialChat, { type: 'loaded', session, messages: [] });
    s = chatReducer(s, { type: 'status', session: { ...session, status: 'resolved', ticket: 42 } });
    expect(s.session).toMatchObject({ status: 'resolved', ticket: 42 });
  });
});

describe('errorMessage', () => {
  it('explains rate limits with the wait time', () => {
    expect(errorMessage(429, { retryAfterSeconds: 60 })).toBe("You're sending messages fast — try again in 60 s.");
  });
  it('passes through friendly server messages and hides internal ones', () => {
    expect(errorMessage(409, { error: 'This chat is closed.' })).toBe('This chat is closed.');
    expect(errorMessage(500, { error: 'db exploded' })).toBe('Something went wrong. Please try again.');
  });
});

describe('animate once', () => {
  it('stops animating a reply once it has played', () => {
    let s = chatReducer(initialChat, { type: 'loaded', session, messages: [] });
    s = chatReducer(s, { type: 'sent', messages: [msg('b', 'bot', '2026-11-25T10:02:00Z')] });
    expect(s.fresh).toEqual(['b']);
    s = chatReducer(s, { type: 'played', id: 'b' });
    expect(s.fresh).toEqual([]);
  });
});

