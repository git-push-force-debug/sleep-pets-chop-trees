import { describe, expect, it } from 'vitest';
import type { GeminiAnswer } from '../../../../packages/shared/src/blocks.ts';
import type { GuideImage } from '../../../../packages/shared/src/guide.ts';
import { coerceAnswer, decideHandoff, sanitize } from './answer.ts';
import type { Evidence } from './dify.ts';

const ev = (sectionId: string, chapter: string, imageIds: string[] = [], score = 0.7): Evidence => ({
  sectionId,
  chapter,
  title: `Title ${sectionId}`,
  imageIds,
  content: '',
  score,
});
const img = (id: string): GuideImage => ({ id, file: `${id}.jpg`, url: `/guide/img/${id}.jpg`, alt: id, caption: '', label: '', width: 1, height: 1 });
const answer = (over: Partial<GeminiAnswer> = {}): GeminiAnswer => ({
  answer_found: true,
  intent: 'game_question',
  blocks: [{ type: 'text', markdown: 'Rebirth opens the next biome.' }],
  suggestions: [],
  used_section_ids: ['rebirth'],
  ...over,
});

describe('decideHandoff', () => {
  it.each([
    [answer(), 0.7, false],
    [answer({ answer_found: false }), 0.7, true],
    [answer(), 0.2, true],
    [answer({ intent: 'wants_human' }), 0.9, true],
    [answer({ intent: 'account_or_purchase' }), 0.9, true],
    [answer({ intent: 'bug_report' }), 0.9, true],
  ])('case %#', (a, score, expected) => {
    expect(decideHandoff(a, score, 0.3)).toBe(expected);
  });
});

describe('sanitize', () => {
  const evidence = [ev('rebirth', 'player-guide', ['ranch-v7-night']), ev('chop', 'player-guide')];
  const images = { 'ranch-v7-night': img('ranch-v7-night'), 'r8-feed-prompt': img('r8-feed-prompt') };

  it('drops images and sources that were not in the retrieved evidence', () => {
    const reply = sanitize(
      answer({
        blocks: [
          { type: 'images', imageIds: ['ranch-v7-night', 'r8-feed-prompt'] },
          { type: 'card', title: 'Deer', imageId: 'r8-feed-prompt', facts: [] },
        ],
        used_section_ids: ['rebirth', 'secret-creator-section'],
      }),
      evidence,
      images,
      'https://site.test',
      false,
    );
    expect(reply.blocks[0]).toEqual({ type: 'images', imageIds: ['ranch-v7-night'] });
    expect(reply.blocks[1]).toEqual({ type: 'card', title: 'Deer', facts: [] });
    expect(reply.sources).toEqual([{ title: 'Title rebirth', url: 'https://site.test/guide/player-guide#rebirth' }]);
    expect(reply.images).toEqual([{ ...images['ranch-v7-night'], url: 'https://site.test/guide/img/ranch-v7-night.jpg' }]);
  });

  it('removes an images block left empty (prompt-injected image ids never render)', () => {
    const reply = sanitize(answer({ blocks: [{ type: 'images', imageIds: ['evil'] }] }), evidence, images, 'https://site.test', false);
    expect(reply.blocks).toEqual([]);
    expect(reply.images).toEqual([]);
  });

  it('keeps at most 3 distinct sources and skips non-guide chapters', () => {
    const many = [ev('a', 'biomes'), ev('b', 'economy'), ev('c', 'faq'), ev('d', 'rewards'), ev('site-person', 'site')];
    const reply = sanitize(answer({ used_section_ids: ['a', 'a', 'site-person', 'b', 'c', 'd'] }), many, {}, 'https://site.test', false);
    expect(reply.sources.map((s) => s.url)).toEqual([
      'https://site.test/guide/biomes#a',
      'https://site.test/guide/economy#b',
      'https://site.test/guide/faq#c',
    ]);
  });

  it('appends a hand-off block when a person should be offered', () => {
    const reply = sanitize(answer({ answer_found: false }), evidence, images, 'https://site.test', true);
    expect(reply.blocks.at(-1)).toEqual({ type: 'handoff', reason: "I couldn't find that in the game guide." });
  });
});

describe('coerceAnswer', () => {
  it('truncates over-long fields instead of rejecting the answer', () => {
    const a = coerceAnswer({ ...answer(), blocks: [{ type: 'table', title: 'x'.repeat(200), columns: ['Stage'], rows: [['1']] }] });
    expect(a?.blocks[0]).toMatchObject({ type: 'table', columns: ['Stage'] });
    expect((a?.blocks[0] as { title: string }).title.length).toBeLessThanOrEqual(80);
  });

  it('drops blocks of unknown type and returns null without any valid block', () => {
    expect(coerceAnswer({ ...answer(), blocks: [{ type: 'markdown', markdown: 'x' }, { type: 'text', markdown: 'ok' }] })?.blocks).toEqual([
      { type: 'text', markdown: 'ok' },
    ]);
    expect(coerceAnswer({ ...answer(), blocks: [{ type: 'markdown', markdown: 'x' }] })).toBeNull();
    expect(coerceAnswer('not json')).toBeNull();
  });
});
