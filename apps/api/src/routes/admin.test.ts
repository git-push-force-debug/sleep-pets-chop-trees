import { describe, expect, it, vi } from 'vitest';
import { buildApp, type Deps } from '../app.ts';
import { computeStats } from '../lib/stats.ts';
import type { MessageRow, SessionRow } from '../lib/store.ts';
import { createFakeDeps } from '../test/fakes.ts';

const as = (user: string) => ({ authorization: `Bearer user:${user}` });

function setup() {
  const dify = {
    retrieve: vi.fn(async () => []),
    addSegment: vi.fn(async () => 'seg-1'),
    updateSegment: vi.fn(async () => {}),
    deleteSegment: vi.fn(async () => {}),
  } as unknown as Deps['dify'];
  const fake = createFakeDeps({ dify });
  fake.agents.push({ user_id: 'admin1', role: 'admin', display_name: 'Lance' }, { user_id: 'agent1', role: 'agent', display_name: 'Maya' });
  return { ...fake, app: buildApp(fake.deps), dify };
}

const ROUTES: [string, string][] = [
  ['POST', '/admin/sync'],
  ['POST', '/admin/sessions/s1/hand-back'],
  ['POST', '/admin/sessions/s1/suggest'],
  ['GET', '/admin/faq'],
  ['POST', '/admin/faq'],
  ['PATCH', '/admin/faq/f1'],
  ['DELETE', '/admin/faq/f1'],
  ['GET', '/admin/gaps'],
  ['POST', '/admin/gaps/g1/resolve'],
  ['GET', '/admin/stats'],
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
  it('mirrors a new FAQ entry into the admin-faq Dify document in segment format', async () => {
    const { app, dify } = setup();
    const res = await app.inject({
      method: 'POST', url: '/admin/faq', headers: as('agent1'),
      payload: { question: 'Is there a trading system?', answer: 'Not yet — trading is planned.' },
    });
    expect(res.statusCode).toBe(200);
    const [datasetId, documentId, content] = (dify.addSegment as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect([datasetId, documentId]).toEqual(['ds-public', 'doc-faq']);
    expect(content).toMatch(/^\[section:faq-[a-z0-9-]+\] \[chapter:faq-admin\] \[images:\]\n### Team answers › Is there a trading system\?\n\nNot yet — trading is planned\.$/);
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
      chatsPerDay: [{ date: '2026-11-24', count: 1 }, { date: '2026-11-25', count: 3 }],
      botOnly: 1,
      handedOff: 3,
      medianFirstReplyMinutes: 6,
      medianResolutionMinutes: 45,
      feedback: { up: 1, down: 1 },
      topSections: [{ title: 'Unlock the six ranch tiers', url: 'https://s/guide/player-guide#rebirth', count: 2 }],
    });
  });
});
