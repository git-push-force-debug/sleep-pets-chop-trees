import type { ChapterSlug } from '../../../packages/shared/src/guide.ts';

export const NAV: { slug: ChapterSlug; label: string }[] = [
  { slug: 'player-guide', label: 'Guide' },
  { slug: 'biomes', label: 'Wildlife' },
  { slug: 'economy', label: 'Gear' },
  { slug: 'rewards', label: 'Rewards' },
  { slug: 'faq', label: 'FAQ' },
  { slug: 'gallery', label: 'Gallery' },
];

export const ROBLOX_URL = 'https://www.roblox.com/games/109510233820622';

/** Opens Pip's chat from anywhere (the launcher listens), optionally asking a question. */
export const openChat = (question?: string) => window.dispatchEvent(new CustomEvent('spct:open-chat', { detail: { question } }));
