// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRoutes, chatwootUrl } from './App.tsx';
import type { AdminAuth } from './auth.ts';

vi.mock('./data.ts', () => ({
  useSessions: () => ({ sessions: [], refresh: vi.fn() }),
  adminApi: vi.fn(async () => ({})),
}));
afterEach(cleanup);

const auth = (over: Partial<AdminAuth>): AdminAuth => ({
  status: 'ready', agent: null, email: 'lance@example.com', signIn: vi.fn(), signOut: vi.fn(), ...over,
});
const at = (a: AdminAuth, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AdminRoutes auth={a} />
    </MemoryRouter>,
  );

describe('admin routes', () => {
  it('asks a signed-out visitor to sign in', () => {
    at(auth({ status: 'signedOut' }));
    expect(screen.getByRole('heading', { name: 'Sign in to Pip Support' })).toBeTruthy();
  });

  it('refuses a signed-in account that is not on the team', () => {
    at(auth({ status: 'notAgent' }));
    expect(screen.getByText("This account isn't on the support team.")).toBeTruthy();
  });

  it('hides Team and Settings from agents and shows them to admins', () => {
    at(auth({ agent: { user_id: 'a', role: 'agent', display_name: 'Maya' } }));
    expect(screen.queryByRole('link', { name: 'Team' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
    cleanup();
    at(auth({ agent: { user_id: 'b', role: 'admin', display_name: 'Lance' } }));
    expect(screen.getByRole('link', { name: 'Team' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy();
  });

  it('builds the exact Chatwoot conversation link', () => {
    expect(chatwootUrl(42)).toBe(`https://app.chatwoot.com/app/accounts/${import.meta.env.VITE_CHATWOOT_ACCOUNT_ID}/conversations/42`);
  });
});
