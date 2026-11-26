import { describe, expect, it } from 'vitest';
import type { GeminiAnswer } from '../../../../packages/shared/src/blocks.ts';
import type { GuideImage } from '../../../../packages/shared/src/guide.ts';
import { coerceAnswer, decideHandoff, handoffReason, sanitize } from './answer.ts';
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
    expect(JSON.stringify(reply.blocks)).not.toContain('evil');
    expect(reply.images.every((i) => evidence.some((e) => e.imageIds.includes(i.id)))).toBe(true);
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

describe('sanitize — pictures and removed pages', () => {
  const images = { 'ranch-v7-night': img('ranch-v7-night') };
  it('never links to the removed gallery page', () => {
    const reply = sanitize(answer({ used_section_ids: ['archive'] }), [ev('archive', 'gallery', ['ranch-v7-night'])], images, 'https://site.test', false);
    expect(reply.sources).toEqual([]);
  });
  it('attaches one picture from the top used section when the answer has none', () => {
    const reply = sanitize(answer(), [ev('rebirth', 'player-guide', ['ranch-v7-night'])], images, 'https://site.test', false);
    expect(reply.blocks.at(-1)).toEqual({ type: 'images', imageIds: ['ranch-v7-night'] });
    expect(reply.images.map((i) => i.id)).toEqual(['ranch-v7-night']);
  });
  it('does not attach a picture to a hand-off-only answer', () => {
    const reply = sanitize(answer({ answer_found: false, used_section_ids: [] }), [ev('rebirth', 'player-guide', ['ranch-v7-night'])], images, 'https://site.test', true);
    expect(reply.blocks.some((b) => b.type === 'images')).toBe(false);
  });
});


describe('Chinese replies', () => {
  it('words the hand-off reason in Chinese', () => {
    expect(handoffReason({ intent: 'account_or_purchase', answer_found: true }, 'zh')).toBe('购买和账号问题需要团队成员来处理。');
    expect(handoffReason({ intent: 'game_question', answer_found: false }, 'zh')).toBe('游戏指南里没有找到这个内容。');
  });

  it('uses Chinese section titles for sources and the Chinese hand-off line', () => {
    const reply = sanitize(answer(), [ev('rebirth', 'player-guide')], {}, 'https://site.test', true, 'zh', { rebirth: '重生' });
    expect(reply.sources).toEqual([{ title: '重生', url: 'https://site.test/guide/player-guide#rebirth' }]);
    expect(reply.blocks.at(-1)).toEqual({ type: 'handoff', reason: '游戏指南里没有找到这个内容。' });
  });
});
