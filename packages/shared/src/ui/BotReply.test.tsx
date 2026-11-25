// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BotReply as Reply } from '../blocks.ts';
import { BotReply } from './BotReply.tsx';

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const image = { id: 'ranch', file: 'ranch.jpg', url: 'https://site.test/guide/img/ranch.jpg', alt: 'The ranch hub', caption: 'The hub at night', label: 'Archived Studio view', width: 1300, height: 729 };

const reply: Reply = {
  blocks: [
    { type: 'text', markdown: 'Open **Rebirth** to see what you need.' },
    { type: 'steps', title: 'First catch', items: [{ title: 'Buy the Dart Pistol', detail: '$5,000' }] },
    { type: 'table', title: 'Ranch tiers', columns: ['Stage', 'Cash'], rows: [['1', '$280,000']] },
    { type: 'stats', items: [{ label: 'Pen slots', value: '7' }] },
    { type: 'images', imageIds: ['ranch'] },
    { type: 'callout', tone: 'tip', text: 'Night speeds recovery 10×.' },
    { type: 'card', title: 'Deer', subtitle: 'Common', facts: [{ label: 'Hits', value: '3' }] },
    { type: 'handoff', reason: "I couldn't find that in the game guide." },
  ],
  suggestions: ['What pet do I need?'],
  sources: [{ title: 'Unlock the six ranch tiers', url: 'https://site.test/guide/player-guide#rebirth' }],
  images: [image],
};

beforeEach(() => mockReducedMotion(true));
afterEach(cleanup);

describe('BotReply', () => {
  it('renders every block type, the sources and the suggestions', () => {
    render(<BotReply reply={reply} onSuggestion={() => {}} onHandoff={() => {}} />);
    expect(screen.getByText('Rebirth').tagName).toBe('STRONG');
    expect(screen.getByText('Buy the Dart Pistol')).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Ranch tiers' })).toBeTruthy();
    expect(screen.getByText('$280,000')).toBeTruthy();
    expect(screen.getByText('Pen slots')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'The ranch hub' })).toBeTruthy();
    expect(screen.getByText('Night speeds recovery 10×.')).toBeTruthy();
    expect(screen.getByText('Deer')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Unlock the six ranch tiers/ }).getAttribute('href')).toBe(
      'https://site.test/guide/player-guide#rebirth',
    );
    expect(screen.getByRole('button', { name: 'What pet do I need?' })).toBeTruthy();
  });

  it('never renders raw HTML or javascript: links from markdown', () => {
    const { container } = render(
      <BotReply
        reply={{ ...reply, blocks: [{ type: 'text', markdown: '<script>alert(1)</script> [click](javascript:alert(1))' }] }}
        onSuggestion={() => {}}
        onHandoff={() => {}}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('renders off-site links as plain text and never renders markdown images', () => {
    const { container } = render(
      <BotReply
        reply={{ ...reply, blocks: [{ type: 'text', markdown: 'Get [Free Robux](https://phish.example) ![x](https://tracker.example/p.png) or read [the guide](/guide/faq)' }] }}
        onSuggestion={() => {}}
        onHandoff={() => {}}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('phish.example');
    expect(screen.getByText('Free Robux').tagName).not.toBe('A');
    expect(screen.getByRole('link', { name: 'the guide' }).getAttribute('href')).toBe('/guide/faq');
  });

  it('shows the full text at first render when the player prefers reduced motion', () => {
    render(<BotReply reply={reply} onSuggestion={() => {}} onHandoff={() => {}} animate />);
    expect(screen.getByText('Rebirth')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'What pet do I need?' })).toBeTruthy();
  });

  it('exposes the full text to screen readers while it types out', () => {
    mockReducedMotion(false);
    render(<BotReply reply={reply} onSuggestion={() => {}} onHandoff={() => {}} animate />);
    expect(screen.getByText('Open Rebirth to see what you need.', { selector: '.spct-sr-only' })).toBeTruthy();
  });

  it('calls onHandoff from the hand-off card and onSuggestion from a chip', () => {
    const onHandoff = vi.fn();
    const onSuggestion = vi.fn();
    render(<BotReply reply={reply} onSuggestion={onSuggestion} onHandoff={onHandoff} />);
    fireEvent.click(screen.getByRole('button', { name: 'Talk to a person' }));
    fireEvent.click(screen.getByRole('button', { name: 'What pet do I need?' }));
    expect(onHandoff).toHaveBeenCalledOnce();
    expect(onSuggestion).toHaveBeenCalledWith('What pet do I need?');
  });
});
