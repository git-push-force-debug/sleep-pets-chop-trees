import { describe, expect, it } from 'vitest';
import { cjkEmphasis } from './Markdown.tsx';

describe('cjkEmphasis', () => {
  it('moves full-width punctuation outside bold markers', () => {
    expect(cjkEmphasis('打开**奖励 → 任务（Missions）**并领取')).toBe('打开**奖励 → 任务（Missions**）并领取');
    expect(cjkEmphasis('购买**（Dart Pistol）**和')).toBe('购买（**Dart Pistol**）和');
  });
  it('spaces bold that starts with a symbol after Chinese', () => {
    expect(cjkEmphasis('基准为**$6/s**。点击**+ / −**。')).toBe('基准为 **$6/s**。点击 **+ / −**。');
  });
  it('leaves bold that already works alone', () => {
    expect(cjkEmphasis('**奖励**（Rewards）和 **$5,000**')).toBe('**奖励**（Rewards）和 **$5,000**');
    expect(cjkEmphasis('plain **bold** text')).toBe('plain **bold** text');
  });
});
