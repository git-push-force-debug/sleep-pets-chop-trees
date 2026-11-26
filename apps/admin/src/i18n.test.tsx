// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRoutes } from './App.tsx';
import type { AdminAuth } from './auth.ts';
import { LangProvider } from './i18n.tsx';

const session = {
  id: 'abcd1234', status: 'waiting_human', bot_paused: true, chatwoot_display_id: 7, roblox_username: 'sleepyrancher22',
  email: null, page_url: '/support', user_agent: null, handoff_at: new Date().toISOString(), resolved_at: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};
const responses: Record<string, unknown> = {
  '/admin/faq': { entries: [{ id: 'f1', question: '怎么转生？', answer: '打开转生面板。', dify_segment_id: null }] },
  '/admin/gaps': { gaps: [{ id: 'g1', question: '有宠物商店吗？', top_score: 0.2, created_at: new Date().toISOString() }] },
  '/admin/team': { team: [{ user_id: 'b', role: 'admin', display_name: 'Lance', email: 'lance@example.com' }] },
  '/admin/settings': { settings: { botEnabled: true, greeting: 'Hi!', starterQuestions: ['How do I rebirth?'], offlineMessage: 'Soon.', evidenceThreshold: 0.5, supportHours: '9–5' } },
};
vi.mock('./data.ts', () => ({
  useSessions: () => ({ sessions: [session], refresh: vi.fn() }),
  useFirstQuestions: () => ({}),
  chatCode: (id: string) => `#${id.slice(0, 4).toUpperCase()}`,
  adminApi: vi.fn(async (path: string) =>
    path.startsWith('/admin/stats')
      ? { chatsPerDay: [{ date: '2026-11-25', count: 3, handed: 1 }], outcomes: { bot: 2, waiting: 1, team: 0, resolved: 0 }, botOnly: 2, handedOff: 1,
          medianFirstReplyMinutes: 4, medianResolutionMinutes: null, feedback: { up: 2, down: 1 }, topSections: [{ title: 'Unlock the six ranch tiers', url: 'https://site.test/guide/player-guide#rebirth', count: 2 }] }
      : responses[path] ?? {}),
}));
vi.mock('./auth.ts', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [] }) }) }) }), channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: vi.fn() },
}));

beforeEach(() => localStorage.setItem('spct-admin-lang', 'zh'));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const admin: AdminAuth = { status: 'ready', agent: { user_id: 'b', role: 'admin', display_name: 'Lance' }, email: 'lance@example.com', signIn: vi.fn(), signOut: vi.fn() };
// Names and terms that stay as they are in Chinese too.
const ALLOWED = new Set(['Pip', 'Chatwoot', 'Roblox', 'CSV', 'FAQ', 'Enter', 'Shift']);
// Test data (names, emails, chat codes, page paths, English settings values) isn't interface text.
const DATA = ['sleepyrancher22', 'lance@example.com', 'Lance', '#ABCD', '/support', 'How do I rebirth?', 'Hi!', 'Soon.'];
const english = (el: HTMLElement) => {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.prose').forEach((p) => p.remove()); // guide body: checked by scripts/lib/translate-check.ts
  copy.querySelectorAll('input, textarea').forEach((i) => i.remove());
  let text = copy.textContent ?? '';
  for (const d of DATA) text = text.split(d).join(' ');
  return text
    .replace(/（[^）]*）/g, '') // English names in brackets after the Chinese name
    .match(/\b[A-Za-z]{3,}\b/g)
    ?.filter((w) => !ALLOWED.has(w)) ?? [];
};

describe('admin in 中文', () => {
  it.each(['/', '/?chat=abcd1234', '/leads', '/knowledge', '/analytics', '/team', '/settings'])('%s has no English text', async (path) => {
    const { container } = render(
      <LangProvider>
        <MemoryRouter initialEntries={[path]}>
          <AdminRoutes auth={admin} />
        </MemoryRouter>
      </LangProvider>,
    );
    await waitFor(() => expect(container.textContent).not.toContain('加载中'));
    expect(english(container)).toEqual([]);
  });

  it('shows the sign-in page in Chinese', () => {
    const { container } = render(
      <LangProvider>
        <MemoryRouter>
          <AdminRoutes auth={{ ...admin, status: 'signedOut', agent: null }} />
        </MemoryRouter>
      </LangProvider>,
    );
    expect(container.querySelector('h1')?.textContent).toBe('登录 Pip 客服');
    expect(english(container)).toEqual([]);
  });
});
