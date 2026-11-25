// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import guide from '../../../../content/guide.json' with { type: 'json' };
import { AppRoutes } from '../App.tsx';

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(cleanup);

// Guide pages are lazy-loaded, so wait for the loading text to go away.
async function at(path: string) {
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByText('Loading the guide…')).toBeNull());
  return view;
}

describe('guide chapter page', () => {
  it('renders section anchors that bot sources link to', async () => {
    const { container } = await at('/guide/player-guide');
    expect(container.querySelector('#rebirth')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Player guide' })).toBeTruthy();
  });

  it('renders guide tables and pictures', async () => {
    const { container } = await at('/guide/player-guide');
    expect(screen.getAllByText('$16,000,000,000').length).toBeGreaterThan(0);
    expect(container.querySelector('img[src^="/guide/img/"]')).not.toBeNull();
  });

  it('filters sections with the search box', async () => {
    await at('/guide/player-guide');
    fireEvent.change(screen.getByLabelText('Search this chapter'), { target: { value: 'golden tree' } });
    expect(screen.queryByRole('heading', { name: 'Unlock the six ranch tiers' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Chop trees and handle knockback' })).toBeTruthy();
  });

  it('has no page for the admin-only creator chapter', async () => {
    await at('/guide/creator');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
  });
});

describe('navigation', () => {
  it('has Home first and no Gallery, and the gallery page is gone', async () => {
    await at('/guide/gallery');
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!;
    const labels = [...nav.querySelectorAll('.nav-links a')].map((a) => a.textContent);
    expect(labels).toEqual(['Home', 'Guide', 'Wildlife', 'Gear', 'Rewards', 'FAQ', 'Support']);
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
  });
});

describe('built bundle', () => {
  const dist = join(__dirname, '../../dist');
  it.skipIf(!existsSync(dist))('contains no creator-chapter text', () => {
    const titles = guide.chapters.find((c) => c.slug === 'creator')!.sections.map((s) => s.title);
    const js = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');
    for (const title of titles) expect(js.includes(title), title).toBe(false);
  });
});
