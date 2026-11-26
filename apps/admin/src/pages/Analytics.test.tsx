// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from '../data.ts';
import { Analytics } from './Analytics.tsx';

const STATS = {
  chatsPerDay: [{ date: '2026-11-24', count: 5, handed: 2 }],
  outcomes: { bot: 3, waiting: 1, team: 0, resolved: 1 },
  botOnly: 3,
  handedOff: 2,
  medianFirstReplyMinutes: 6,
  medianResolutionMinutes: 40,
  feedback: { up: 4, down: 1 },
  topSections: [],
};
vi.mock('../data.ts', () => ({ adminApi: vi.fn(async () => STATS) }));
afterEach(cleanup);

const lastQuery = () => String((adminApi as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]);

describe('Analytics dashboard', () => {
  it('filters every chart when a tile, then a day bar, is clicked, and clears again', async () => {
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
    render(<MemoryRouter><Analytics /></MemoryRouter>);
    const tile = await screen.findByRole('button', { name: /Handed to a person/ });
    fireEvent.click(tile);
    await waitFor(() => expect(lastQuery()).toContain('outcome=handed'));
    expect(tile.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /2026-11-24/ }));
    await waitFor(() => expect(lastQuery()).toContain(`to=${encodeURIComponent('2026-11-25T00:00:00.000Z')}`));

    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }));
    await waitFor(() => expect(lastQuery()).not.toContain('outcome='));
  });
});
