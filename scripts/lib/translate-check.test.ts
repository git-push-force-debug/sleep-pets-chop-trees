import { describe, expect, it } from 'vitest';
import { checkTranslation } from './translate-check.ts';

const en = '## Start\n\nBuy the Dart Pistol for **$5,000**.\n\n- Step one\n- Step two\n\n| Tier | Price |\n|---|---|\n| 1 | 12% |';

describe('checkTranslation', () => {
  it('accepts a faithful translation', () => {
    expect(checkTranslation(en, '## 开始\n\n用 **$5,000** 购买 Dart Pistol。\n\n- 第一步\n- 第二步\n\n| 等级 | 价格 |\n|---|---|\n| 1 | 12% |')).toBeNull();
  });
  it('rejects a dropped number', () => {
    expect(checkTranslation(en, '## 开始\n\n购买 Dart Pistol。\n\n- 第一步\n- 第二步\n\n| 等级 | 价格 |\n|---|---|\n| 1 | 12% |')).toMatch(/5000/);
  });
  it('rejects a lost table row', () => {
    expect(checkTranslation(en, '## 开始\n\n$5,000\n\n- a\n- b\n\n| 等级 | 价格 |\n|---|---|')).toBe('table rows differ');
  });
  it('rejects a changed image token', () => {
    expect(checkTranslation('A\n\n[image:ranch-v7-night]', 'A\n\n[图片:ranch-v7-night]')).toBe('image tokens differ');
  });
  it('rejects text left in English', () => {
    expect(checkTranslation('Claim both gifts in the rewards menu before you leave.', 'Claim both gifts in the rewards menu before you leave.')).toMatch(/not translated/);
  });
  it('accepts a section that is only pictures', () => {
    expect(checkTranslation('[image:overhaul-overview]\n\n[image:p2-savanna-play-client]', '[image:overhaul-overview]\n\n[image:p2-savanna-play-client]')).toBeNull();
  });
});
