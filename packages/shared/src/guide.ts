import { z } from 'zod';

export const CHAPTER_SLUGS = ['player-guide', 'biomes', 'economy', 'rewards', 'faq', 'gallery', 'creator'] as const;
export type ChapterSlug = (typeof CHAPTER_SLUGS)[number];

export const GuideImageSchema = z.object({
  id: z.string(),
  file: z.string(),
  url: z.string(),
  alt: z.string(),
  caption: z.string(),
  label: z.string(),
  width: z.number(),
  height: z.number(),
});
export type GuideImage = z.infer<typeof GuideImageSchema>;

export interface Section {
  id: string;
  title: string;
  markdown: string;
  imageIds: string[];
}

export interface Chapter {
  slug: ChapterSlug;
  number: string;
  title: string;
  summary: string;
  internal: boolean;
  sections: Section[];
}

export interface Guide {
  chapters: Chapter[];
  images: Record<string, GuideImage>;
}

// First line of every Dify segment; retrieval maps segments back to guide sections with it.
export const SEGMENT_HEADER_RE = /^\[section:([a-z0-9-]+)\] \[chapter:([a-z-]+)\] \[images:([^\]]*)\]$/m;

export const formatSegmentHeader = (sectionId: string, chapter: string, imageIds: string[]) =>
  `[section:${sectionId}] [chapter:${chapter}] [images:${imageIds.join(',')}]`;
