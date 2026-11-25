import guideJson from '../../../content/guide.public.json' with { type: 'json' };
import type { Chapter, Guide, GuideImage } from '../../../packages/shared/src/guide.ts';

// Only the public guide (chapters 01–06) is ever imported by the website bundle.
export const guide = guideJson as Guide;

export const NAV: { slug: Chapter['slug']; label: string }[] = [
  { slug: 'player-guide', label: 'Guide' },
  { slug: 'biomes', label: 'Wildlife' },
  { slug: 'economy', label: 'Gear' },
  { slug: 'rewards', label: 'Rewards' },
  { slug: 'faq', label: 'FAQ' },
  { slug: 'gallery', label: 'Gallery' },
];

export const chapterBySlug = (slug: string | undefined) => guide.chapters.find((c) => c.slug === slug);

export type Piece = { kind: 'md'; text: string } | { kind: 'img'; image: GuideImage };

/** Splits section markdown at [image:id] tokens so pictures render as real figures. */
export function piecesOf(markdown: string): Piece[] {
  return markdown.split(/\[image:([a-z0-9-]+)\]/).flatMap((part, i): Piece[] => {
    if (i % 2 === 0) return part.trim() ? [{ kind: 'md', text: part }] : [];
    const image = guide.images[part];
    return image ? [{ kind: 'img', image }] : [];
  });
}

export const ROBLOX_URL = 'https://www.roblox.com/games/109510233820622';

/** Opens Pip's chat from anywhere (the launcher listens), optionally asking a question. */
export const openChat = (question?: string) => window.dispatchEvent(new CustomEvent('spct:open-chat', { detail: { question } }));
