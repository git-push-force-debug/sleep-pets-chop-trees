import { useEffect, useState } from 'react';
import guideJson from '../../../content/guide.public.json' with { type: 'json' };
import type { Guide, GuideImage } from '../../../packages/shared/src/guide.ts';
import { useLang } from './i18n.tsx';

// Only the public guide (chapters 01–06) is ever imported by the website bundle, and only by guide pages.
export const guide = guideJson as Guide;

// The Chinese guide is a separate chunk, fetched only when the site is in 中文.
let zhGuide: Guide | null = null;
const loadZh = () => import('../../../content/guide.public.zh.json').then((m) => (zhGuide = m.default as Guide));

/** The guide in the current language; null while the Chinese one is still loading. */
export function useGuide(): Guide | null {
  const { lang } = useLang();
  const [, loaded] = useState(0);
  useEffect(() => {
    if (lang === 'zh' && !zhGuide) void loadZh().then(() => loaded((n) => n + 1));
  }, [lang]);
  return lang === 'zh' ? zhGuide : guide;
}

// The gallery chapter stays in Pip's knowledge but has no page of its own.
export const chapterBySlug = (g: Guide, slug: string | undefined) => (slug === 'gallery' ? undefined : g.chapters.find((c) => c.slug === slug));

export type Piece = { kind: 'md'; text: string } | { kind: 'img'; image: GuideImage };

/** Splits section markdown at [image:id] tokens so pictures render as real figures. */
export function piecesOf(g: Guide, markdown: string): Piece[] {
  return markdown.split(/\[image:([a-z0-9-]+)\]/).flatMap((part, i): Piece[] => {
    if (i % 2 === 0) return part.trim() ? [{ kind: 'md', text: part }] : [];
    const image = g.images[part];
    return image ? [{ kind: 'img', image }] : [];
  });
}
