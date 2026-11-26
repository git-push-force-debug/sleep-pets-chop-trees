import { describe, expect, it } from 'vitest';
import { glossaryLines } from './glossary.ts';

describe('glossaryLines', () => {
  it('lists only names that appear as whole words, longest first', () => {
    const g = { Wood: '木材', 'Dart Pistol': '飞镖手枪', Fox: '狐狸', Snowland: '雪地' };
    expect(glossaryLines(g, 'Buy the Dart Pistol for $5,000 and chop Wood. Foxes run.')).toBe('Dart Pistol → 飞镖手枪\nWood → 木材');
  });
});
