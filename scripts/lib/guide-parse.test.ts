import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { beforeAll, describe, expect, it } from 'vitest';
import { SEGMENT_HEADER_RE, type Guide } from '../../packages/shared/src/guide.ts';
import { parseGuide, publicGuide, toDifyDocument } from './guide-parse.ts';

const GUIDE_HTML =
  process.env.GUIDE_HTML ??
  `${homedir()}/Documents/Codex/2026-11-25/look-at-hte/outputs/sleep-pets-and-chop-trees-guide.html`;

let guide: Guide;
let imageBytes: Map<string, Buffer>;

beforeAll(() => {
  ({ guide, imageBytes } = parseGuide(readFileSync(GUIDE_HTML, 'utf8')));
});

const allSections = () => guide.chapters.flatMap((c) => c.sections);

describe('parseGuide', () => {
  it('finds 7 chapters and 56 sections', () => {
    expect(guide.chapters.map((c) => c.slug)).toEqual([
      'player-guide', 'biomes', 'economy', 'rewards', 'faq', 'gallery', 'creator',
    ]);
    expect(allSections()).toHaveLength(56);
  });

  it('marks only the creator chapter internal', () => {
    expect(guide.chapters.filter((c) => c.internal).map((c) => c.slug)).toEqual(['creator']);
  });

  it('resolves every image reference to non-empty bytes', () => {
    const ids = allSections().flatMap((s) => s.imageIds);
    expect(ids.length).toBeGreaterThan(100);
    for (const id of ids) {
      expect(guide.images[id], id).toBeDefined();
      expect(imageBytes.get(id)?.length, id).toBeGreaterThan(0);
    }
  });

  it('keeps table numbers exactly', () => {
    const rebirth = allSections().find((s) => s.id === 'rebirth');
    expect(rebirth?.markdown).toContain('$16,000,000,000');
  });

  it('leaves no script tags or embedded image data in markdown', () => {
    for (const s of allSections()) {
      expect(s.markdown).not.toContain('<script');
      expect(s.markdown).not.toContain('data:image');
      expect(s.markdown).not.toContain('<table');
    }
  });
});

describe('publicGuide', () => {
  it('drops the creator chapter, its sections and its images', () => {
    const pub = publicGuide(guide);
    const creatorIds = guide.chapters.find((c) => c.slug === 'creator')!.sections.map((s) => s.id);
    expect(pub.chapters.map((c) => c.slug)).not.toContain('creator');
    expect(JSON.stringify(pub)).not.toMatch(new RegExp(`"id":"(${creatorIds.join('|')})"`));
    const usedIds = new Set(pub.chapters.flatMap((c) => c.sections.flatMap((s) => s.imageIds)));
    expect(Object.keys(pub.images).every((id) => usedIds.has(id))).toBe(true);
  });
});

describe('toDifyDocument', () => {
  it('starts every segment with a header and keeps segments under 6,500 characters', () => {
    for (const chapter of guide.chapters) {
      const segments = toDifyDocument(chapter).split('\n\n=====\n\n');
      for (const seg of segments) {
        expect(seg.split('\n')[0]).toMatch(SEGMENT_HEADER_RE);
        expect(seg.length).toBeLessThanOrEqual(6500);
      }
    }
  });
});
