import { describe, expect, it } from 'vitest';
import { buildContents, replyLang, ZH_INSTRUCTION } from './prompt.ts';

const lastText = (question: string, lang?: 'en' | 'zh') => buildContents(question, [], [], lang).at(-1)!.parts[0]!.text;

describe('replyLang', () => {
  it.each([
    ['how do I rebirth?', 'zh', 'zh'], // 中文 site, English question
    ['怎么转生？', undefined, 'zh'], // Chinese question on the English site
    ['how do I rebirth?', 'en', 'en'],
    ['Bagaimana cara rebirth?', 'en', 'en'], // Malay follows the question's own language
  ] as const)('%s on %s → %s', (q, lang, expected) => {
    expect(replyLang(q, lang)).toBe(expected);
  });
});

describe('buildContents', () => {
  it('adds the Chinese reply instruction only for zh', () => {
    expect(lastText('怎么转生？', 'zh')).toContain(ZH_INSTRUCTION);
    expect(lastText('how do I rebirth?', 'en')).not.toContain('REPLY LANGUAGE');
  });
});
