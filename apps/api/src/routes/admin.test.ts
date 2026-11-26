import { describe, expect, it, vi } from 'vitest';
import { buildApp, type Deps } from '../app.ts';
import { computeStats } from '../lib/stats.ts';
import type { MessageRow, SessionRow } from '../lib/store.ts';
import { createFakeDeps } from '../test/fakes.ts';
import { FAQ_SYNC_ERROR } from './admin.ts';

const as = (user: string) => ({ authorization: `Bearer user:${user}` });

function setup() {
  const dify = {
    retrieve: vi.fn(async () => []),
    updateDocumentByText: vi.fn(async () => {}),
  } as unknown as Deps['dify'];
  const fake = createFakeDeps({ dify });
  fake.agents.push({ user_id: 'admin1', role: 'admin', display_name: 'Lance' }, { user_id: 'agent1', role: 'agent', display_name: 'Maya' });
  return { ...fake, app: buildApp(fake.deps), dify };
}

const ROUTES: [string, string][] = [
  ['POST', '/admin/sync'],
  ['POST', '/admin/sessions/s1/hand-back'],
  ['POST', '/admin/sessions/s1/suggest'],
  ['POST', '/admin/sessions/s1/reply'],
  ['POST', '/admin/sessions/s1/ask-resolved'],
  ['POST', '/admin/sessions/s1/resolve'],
  ['GET', '/admin/faq'],
  ['POST', '/admin/faq'],
  ['PATCH', '/admin/faq/f1'],
  ['DELETE', '/admin/faq/f1'],
  ['GET', '/admin/gaps'],
  ['POST', '/admin/gaps/g1/resolve'],
  ['GET', '/admin/stats'],
  ['GET', '/admin/export/conversations'],
  ['GET', '/admin/team'],
  ['POST', '/admin/team'],
  ['PATCH', '/admin/team/u9'],
  ['DELETE', '/admin/team/u9'],
  ['GET', '/admin/settings'],
  ['PUT', '/admin/settings'],
];

describe('admin access', () => {
  it.each(ROUTES)('%s %s refuses players (403) and missing tokens (401)', async (method, url) => {
    const { app } = setup();
    expect((await app.inject({ method: method as 'GET', url, headers: as('player1'), payload: {} })).statusCode).toBe(403);
    expect((await app.inject({ method: method as 'GET', url, payload: {} })).statusCode).toBe(401);
  });

  it('keeps team changes and settings for admins only', async () => {
    const { app } = setup();
    const team = await app.inject({ method: 'POST', url: '/admin/team', headers: as('agent1'), payload: { email: 'x@y.z', displayName: 'X', role: 'agent' } });
    expect(team.statusCode).toBe(403);
    const settings = await app.inject({ method: 'PUT', url: '/admin/settings', headers: as('agent1'), payload: {} });
    expect(settings.statusCode).toBe(403);
    expect((await app.inject({ url: '/admin/settings', headers: as('agent1') })).statusCode).toBe(200);
  });
});

describe('admin FAQ', () => {
  const lastDoc = (dify: Deps['dify']) => (dify.updateDocumentByText as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;

  it('rebuilds the whole admin-faq Dify document after add, edit and delete', async () => {
    const { app, dify } = setup();
    const res = await app.inject({
      method: 'POST', url: '/admin/faq', headers: as('agent1'),
      payload: { question: 'Is there a trading system?', answer: 'Not yet — trading is planned.' },
    });
    expect(res.statusCode).toBe(200);
    const [datasetId, documentId, name, text] = lastDoc(dify);
    expect([datasetId, documentId, name]).toEqual(['ds-public', 'doc-faq', 'admin-faq']);
    expect(text).toMatch(/\n\n=====\n\n\[section:faq-[a-z0-9-]+\] \[chapter:faq-admin\] \[images:\]\n### Team answers › Is there a trading system\?\n\nNot yet — trading is planned\.$/);

    const id = res.json().entry.id;
    await app.inject({ method: 'PATCH', url: `/admin/faq/${id}`, headers: as('agent1'), payload: { question: 'Can I trade pets?', answer: 'Not yet.' } });
    expect(lastDoc(dify)[3]).toContain('### Team answers › Can I trade pets?');
    expect((await app.inject({ method: 'DELETE', url: `/admin/faq/${id}`, headers: as('agent1') })).statusCode).toBe(204);
    expect(lastDoc(dify)[3]).not.toContain('Team answers › Can I trade');
  });

  it('keeps the answer and says so when Dify rejects the rebuild', async () => {
    const { app, dify, store } = setup();
    (dify.updateDocumentByText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Dify down'));
    const res = await app.inject({ method: 'POST', url: '/admin/faq', headers: as('agent1'), payload: { question: 'Hello there?', answer: 'Hi!' } });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe(FAQ_SYNC_ERROR);
    expect((await store.listFaq()).map((f) => f.question)).toEqual(['Hello there?']);
  });
});

describe('admin hand-back', () => {
  it('returns a chat to the bot', async () => {
    const { app, store, sessions } = setup();
    const s = await store.createSession('player1', {});
    s.status = 'human';
    s.bot_paused = true;
    expect((await app.inject({ method: 'POST', url: `/admin/sessions/${s.id}/hand-back`, headers: as('agent1') })).statusCode).toBe(200);
    expect(sessions[0]).toMatchObject({ status: 'bot', bot_paused: false });
  });
});

describe('admin replies and resolving', () => {
  it('posts a team reply into the chat and moves it to a person', async () => {
    const { app, store, sessions, messages } = setup();
    const s = await store.createSession('player1', {});
    const res = await app.inject({ method: 'POST', url: `/admin/sessions/${s.id}/reply`, headers: as('agent1'), payload: { text: ' On it! ' } });
    expect(res.statusCode).toBe(200);
    expect(messages.at(-1)).toMatchObject({ role: 'agent', content: 'On it!', agent_name: 'Maya' });
    expect(sessions[0]).toMatchObject({ status: 'human', bot_paused: true });
    expect((await app.inject({ method: 'POST', url: `/admin/sessions/${s.id}/reply`, headers: as('agent1'), payload: { text: '  ' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/admin/sessions/nope/reply', headers: as('agent1'), payload: { text: 'hi' } })).statusCode).toBe(404);
  });

  it('asks the player if it is solved, resolves, and refuses replies after that', async () => {
    const { app, store, sessions, messages } = setup();
    const s = await store.createSession('player1', {});
    s.status = 'human';
    expect((await app.inject({ method: 'POST', url: `/admin/sessions/${s.id}/ask-resolved`, headers: as('agent1') })).statusCode).toBe(200);
    expect(messages.at(-1)).toMatchObject({ role: 'bot', reply: expect.objectContaining({ ask: 'resolve' }) });
    expect((await app.inject({ method: 'POST', url: `/admin/sessions/${s.id}/resolve`, headers: as('agent1') })).statusCode).toBe(200);
    expect(sessions[0]!.status).toBe('resolved');
    expect(sessions[0]!.resolved_at).not.toBeNull();
    expect(messages.at(-1)).toMatchObject({ role: 'system', content: 'Resolved by Maya' });
    expect((await app.inject({ method: 'POST', url: `/admin/sessions/${s.id}/reply`, headers: as('agent1'), payload: { text: 'hi' } })).statusCode).toBe(409);
  });
});

describe('computeStats', () => {
  const base = { user_id: 'u', bot_paused: false, last_chatwoot_message_id: 0, roblox_username: null, email: null, page_url: null, user_agent: null, updated_at: '' };
  const session = (id: string, created: string, handoff: string | null, resolved: string | null): SessionRow => ({
    ...base, id, status: resolved ? 'resolved' : handoff ? 'human' : 'bot', chatwoot_display_id: handoff ? 1 : null,
    created_at: created, handoff_at: handoff, resolved_at: resolved,
  });
  const msg = (session_id: string, role: MessageRow['role'], created_at: string, feedback: 1 | -1 | null = null, url?: string): MessageRow => ({
    id: `${session_id}-${created_at}`, session_id, role, content: '', chatwoot_message_id: null, agent_name: null, feedback, created_at,
    reply: url ? { blocks: [], suggestions: [], images: [], sources: [{ title: 'Unlock the six ranch tiers', url }] } : null,
  });

  it('counts chats per day and computes medians in minutes', () => {
    const sessions = [
      session('a', '2026-11-24T10:00:00Z', null, null),
      session('b', '2026-11-25T10:00:00Z', '2026-11-25T10:00:00Z', '2026-11-25T11:00:00Z'),
      session('c', '2026-11-25T12:00:00Z', '2026-11-25T12:00:00Z', '2026-11-25T12:30:00Z'),
      session('d', '2026-11-25T13:00:00Z', '2026-11-25T13:00:00Z', null),
    ];
    const messages = [
      msg('a', 'bot', '2026-11-24T10:00:05Z', 1, 'https://s/guide/player-guide#rebirth'),
      msg('a', 'bot', '2026-11-24T10:01:00Z', -1, 'https://s/guide/player-guide#rebirth'),
      msg('b', 'agent', '2026-11-25T10:04:00Z'),
      msg('b', 'agent', '2026-11-25T10:20:00Z'),
      msg('c', 'agent', '2026-11-25T12:10:00Z'),
      msg('d', 'agent', '2026-11-25T13:06:00Z'),
    ];
    expect(computeStats(sessions, messages)).toEqual({
      chatsPerDay: [{ date: '2026-11-24', count: 1, handed: 0 }, { date: '2026-11-25', count: 3, handed: 3 }],
      outcomes: { bot: 1, waiting: 0, team: 1, resolved: 2 },
      botOnly: 1,
      handedOff: 3,
      medianFirstReplyMinutes: 6,
      medianResolutionMinutes: 45,
      feedback: { up: 1, down: 1 },
      topSections: [{ title: 'Unlock the six ranch tiers', url: 'https://s/guide/player-guide#rebirth', count: 2 }],
    });
  });
});

describe('dashboard filters and export', () => {
  it('filters stats by outcome and starting page, and rejects unknown filters', async () => {
    const { app, store } = setup();
    const a = await store.createSession('p1', { page_url: '/' });
    const b = await store.createSession('p2', { page_url: '/guide/biomes' });
    Object.assign(b, { status: 'resolved', handoff_at: b.created_at, resolved_at: b.created_at });
    const get = async (q: string) => (await app.inject({ url: `/admin/stats?${q}`, headers: as('agent1') })).json();
    expect((await get('outcome=resolved')).outcomes).toMatchObject({ bot: 0, resolved: 1 });
    expect((await get('page=home')).outcomes).toMatchObject({ bot: 1, resolved: 0 });
    expect((await get('page=guide&outcome=bot')).botOnly).toBe(0);
    expect((await app.inject({ url: '/admin/stats?outcome=nope', headers: as('agent1') })).statusCode).toBe(400);
    expect(a.id).toBeTruthy();
  });

  it('exports one row per message of the filtered chats', async () => {
    const { app, store } = setup();
    const s = await store.createSession('p1', { page_url: '/support' });
    Object.assign(s, { status: 'human', handoff_at: s.created_at, chatwoot_display_id: 4, roblox_username: 'sleepy', email: 'a@example.com' });
    await store.insertMessages([
      { session_id: s.id, role: 'user', content: 'help' },
      { session_id: s.id, role: 'agent', content: 'on it', agent_name: 'Maya' },
    ]);
    const res = await app.inject({ url: '/admin/export/conversations?outcome=handed', headers: as('agent1') });
    expect(res.json().rows).toEqual([
      expect.objectContaining({ ticket: '#10004', roblox_username: 'sleepy', email: 'a@example.com', author: 'Player', message: 'help' }),
      expect.objectContaining({ author: 'Maya', message: 'on it' }),
    ]);
    expect((await app.inject({ url: '/admin/export/conversations?outcome=bot', headers: as('agent1') })).json().rows).toEqual([]);
  });
});
