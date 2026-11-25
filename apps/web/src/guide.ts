import guideJson from '../../../content/guide.public.json' with { type: 'json' };
import type { Guide, GuideImage } from '../../../packages/shared/src/guide.ts';

// Only the public guide (chapters 01–06) is ever imported by the website bundle, and only by guide pages.
export const guide = guideJson as Guide;

// The gallery chapter stays in Pip's knowledge but has no page of its own.
export const chapterBySlug = (slug: string | undefined) => (slug === 'gallery' ? undefined : guide.chapters.find((c) => c.slug === slug));

export type Piece = { kind: 'md'; text: string } | { kind: 'img'; image: GuideImage };

/** Splits section markdown at [image:id] tokens so pictures render as real figures. */
export function piecesOf(markdown: string): Piece[] {
  return markdown.split(/\[image:([a-z0-9-]+)\]/).flatMap((part, i): Piece[] => {
    if (i % 2 === 0) return part.trim() ? [{ kind: 'md', text: part }] : [];
    const image = guide.images[part];
    return image ? [{ kind: 'img', image }] : [];
  });
}
