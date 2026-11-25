export const NAV: { to: string; label: string }[] = [
  { to: '/', label: 'Home' },
  { to: '/guide/player-guide', label: 'Guide' },
  { to: '/guide/biomes', label: 'Wildlife' },
  { to: '/guide/economy', label: 'Gear' },
  { to: '/guide/rewards', label: 'Rewards' },
  { to: '/guide/faq', label: 'FAQ' },
  { to: '/support', label: 'Support' },
];

export const ROBLOX_URL = 'https://www.roblox.com/games/109510233820622';

/** Opens Pip's chat from anywhere (the launcher listens): optionally asks a question, or opens the hand-off form. */
export const openChat = (detail: { question?: string; handoff?: boolean } = {}) =>
  window.dispatchEvent(new CustomEvent('spct:open-chat', { detail }));
