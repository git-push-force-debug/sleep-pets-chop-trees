import type { Strings } from './i18n.tsx';

export const NAV: { to: string; label: keyof Strings['nav'] }[] = [
  { to: '/', label: 'home' },
  { to: '/guide/player-guide', label: 'guide' },
  { to: '/guide/biomes', label: 'wildlife' },
  { to: '/guide/economy', label: 'gear' },
  { to: '/guide/rewards', label: 'rewards' },
  { to: '/guide/faq', label: 'faq' },
  { to: '/support', label: 'support' },
];

export const ROBLOX_URL = 'https://www.roblox.com/games/109510233820622';

/** Opens Pip's chat from anywhere (the launcher listens): optionally asks a question, or opens the hand-off form. */
export const openChat = (detail: { question?: string; handoff?: boolean } = {}) =>
  window.dispatchEvent(new CustomEvent('spct:open-chat', { detail }));
