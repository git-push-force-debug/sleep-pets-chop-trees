import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BlockSchema, GeminiAnswerSchema, geminiResponseSchema } from './blocks.ts';

const valid = [
  { type: 'text', markdown: 'Hello **rancher**' },
  { type: 'steps', title: 'First catch', items: [{ title: 'Buy the Dart Pistol', detail: '$5,000' }] },
  { type: 'table', columns: ['Stage', 'Cash'], rows: [['1', '$280,000']] },
  { type: 'stats', items: [{ label: 'Animals', value: '72' }] },
  { type: 'images', imageIds: ['loading'] },
  { type: 'callout', tone: 'tip', text: 'Night speeds recovery 10×.' },
  { type: 'card', title: 'Deer', facts: [{ label: 'Rarity', value: 'Common' }] },
  { type: 'handoff', reason: 'Not in the guide' },
];

const answer = (blocks: unknown[], suggestions: string[] = []) => ({
  answer_found: true,
  intent: 'game_question',
  blocks,
  suggestions,
  used_section_ids: ['rebirth'],
});

describe('BlockSchema', () => {
  it.each(valid)('accepts a valid $type block', (block) => {
    expect(BlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects a table with 9 columns', () => {
    const columns = Array.from({ length: 9 }, (_, i) => `c${i}`);
    expect(BlockSchema.safeParse({ type: 'table', columns, rows: [] }).success).toBe(false);
  });

  it('rejects an images block with no ids', () => {
    expect(BlockSchema.safeParse({ type: 'images', imageIds: [] }).success).toBe(false);
  });
});

describe('GeminiAnswerSchema', () => {
  it('rejects an answer with no blocks', () => {
    expect(GeminiAnswerSchema.safeParse(answer([])).success).toBe(false);
  });

  it('rejects an answer with 4 suggestions', () => {
    expect(GeminiAnswerSchema.safeParse(answer([valid[0]], ['a', 'b', 'c', 'd'])).success).toBe(false);
  });

  it('accepts a well-formed answer', () => {
    expect(GeminiAnswerSchema.safeParse(answer([valid[0]], ['a'])).success).toBe(true);
  });

  it('exports a JSON schema with a block union for Gemini', () => {
    expect(JSON.stringify(z.toJSONSchema(GeminiAnswerSchema))).toContain('"anyOf"');
  });

  it('gives Gemini a structure-only schema without length limits', () => {
    const json = JSON.stringify(geminiResponseSchema());
    expect(json).toContain('"anyOf"');
    expect(json).not.toMatch(/"(minLength|maxLength|minItems|maxItems|\$schema)"/);
    expect(json).not.toContain('"const"');
    expect(json).toContain('"enum":["text"]');
  });
});
