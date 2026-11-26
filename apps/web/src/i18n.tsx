import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { UI_EN, UI_ZH, UiLabelsContext } from '../../../packages/shared/src/ui/labels.tsx';

export type Lang = 'en' | 'zh';
export const LANGS: { id: Lang; label: string; htmlLang: string }[] = [
  { id: 'en', label: 'EN', htmlLang: 'en' },
  { id: 'zh', label: '中文', htmlLang: 'zh-Hans' },
];

const en = {
  skip: 'Skip to content',
  brandHome: 'Sleep Pets & Chop Trees — home',
  nav: { home: 'Home', guide: 'Guide', wildlife: 'Wildlife', gear: 'Gear', rewards: 'Rewards', faq: 'FAQ', support: 'Support' },
  menu: 'Menu',
  language: 'Language',
  playOnRoblox: 'Play on Roblox',
  footerName: 'Sleep Pets & Chop Trees · official guide & help',
  footerLegal: 'Not affiliated with Roblox Corporation.',

  heroTitle: 'Put wild pets to sleep. Build the coziest ranch.',
  heroText: 'Dart wild animals, carry them home and let them earn Cash in your pen. Chop trees for Wood, then rebirth through six biomes.',
  readGuide: 'Read the guide',
  videoTitle: 'A cozy ranch that grows with you',
  videoText: 'Sneak up on wild animals, dart them to sleep and carry them home before they wake. Every pet you place earns Cash while you chop, upgrade and explore.',
  playNow: 'Play now',
  firstRanch: 'First ranch, step by step →',
  videoSoon: 'Gameplay video coming soon',
  loopTitle: 'The ranch loop',
  loop: {
    sleep: { title: 'Sleep', text: 'Aim the dart gun and fill sleep progress to 100%.' },
    carry: { title: 'Carry', text: 'Pick it up and cross the brick edge before it wakes.' },
    ranch: { title: 'Ranch', text: 'Placed pets earn Cash. Feed them and buy stats.' },
    chop: { title: 'Chop', text: 'Swing melee tools at trees for Wood. Golden trees pay 5×.' },
    rebirth: { title: 'Rebirth', text: 'Spend Cash, Wood and the right pet to open the next biome.' },
  },
  biomesTitle: 'Six biomes to explore',
  biomesText: 'From sunny grassland to the glowing Enchanted Grove — every rebirth opens a new world.',
  biomesLabel: 'Biomes',
  askTitle: 'Stuck? Ask Pip.',
  askText: "Pip answers from the official game guide — with tables, pictures and steps. If Pip can't find it, a real person from the team joins the same chat.",
  starters: ['How do I rebirth?', 'Best gun for Snowland?', 'Why did my pet wake up?'],

  supportEyebrow: 'Help & support',
  supportTitle: 'How can we help?',
  supportLede: 'Pip knows the whole game guide, and real people from the team are online around the clock for everything else.',
  askPipTitle: 'Ask Pip',
  askPipText: 'Instant answers from the official guide, with tables, steps and pictures.',
  askQuestion: 'Ask a question',
  personTitle: 'Talk to a person',
  personText: "Purchases, bugs, lost pets or account problems. You'll get a ticket number and a reply in the same chat.",
  contactTeam: 'Contact the team',
  commonTitle: 'Common questions',
  common: ['How do I rebirth?', 'Why did my pet wake up and run?', 'Where are the free rewards and codes?', 'My purchase or game pass is missing'],
  safetyLead: 'Stay safe:',
  safetyText: 'the team will never ask for your password, a verification code or payment details. Free Robux offers are always scams.',

  notFoundTitle: 'Page not found',
  notFoundText: 'This page wandered off into the Enchanted Grove.',
  backHome: 'Back to the ranch →',

  loadingGuide: 'Loading the guide…',
  inChapter: 'In this chapter',
  sectionsLabel: 'Sections',
  guideEyebrow: 'Guide',
  stillUnsure: 'Still unsure? Ask Pip — it reads this guide.',
  askPip: 'Ask Pip',

  chatWith: 'Chat with Pip',
  launcherOpen: 'Ask Pip — open chat',
  launcherDrag: 'Drag to move Pip to either side',
  launcherHi: "Hi! I'm Pip",
  launcherAsk: 'Ask me anything',
  greeting: "Hi, I'm Pip! Ask me anything about Sleep Pets & Chop Trees.",
  thinking: ['Reading your question', 'Searching the guide', 'Writing the answer'],
  thinkingLabel: 'Pip is looking in the guide',
  sending: 'Sending…',
  ticket: 'Ticket',
  connected: 'Connected to the team',
  joining: 'A person is joining…',
  robloxUsername: 'Roblox username',
  email: 'Email',
  optional: '(optional)',
  helpWith: 'What do you need help with?',
  sendToTeam: 'Send to the team',
  cancel: 'Cancel',
  handoffHint: "The team sees this chat, so you won't need to repeat yourself. Never share your password.",
  wasHelpful: 'Was this helpful?',
  helpful: 'Helpful',
  notHelpful: 'Not helpful',
  team: 'team',
  supportName: 'Support',
  offline: 'Offline right now',
  online: 'Online · answers from the official guide',
  waking: 'Waking up…',
  resolved: 'Resolved',
  closeChat: 'Close chat',
  joined: (name: string) => `${name} joined the chat`,
  aPerson: 'A person',
  glad: 'Glad we sorted it!',
  ticketClosed: (ticket: string) => `Ticket ${ticket} is closed. `,
  hereForElse: 'Pip is here for anything else.',
  askElse: 'Ask Pip something else',
  messagePip: 'Message Pip',
  chatClosed: 'This chat is closed',
  messageTeam: 'Message the team…',
  askGame: 'Ask about the game…',
  send: 'Send',
  systemNotes: { 'Player confirmed it’s solved': 'Player confirmed it’s solved' } as Record<string, string>,

  errFast: (s: number) => `You're sending messages fast — try again in ${s} s.`,
  errOffline: "You're offline. Check your connection and try again.",
  errGeneric: 'Something went wrong. Please try again.',
  errStart: "We couldn't start the chat. Please refresh the page.",
  /** Shown instead of the server's English text for these statuses when the site is in Chinese. */
  errStatus: {} as Record<number, string>,
};
export type Strings = typeof en;

const zh: Strings = {
  skip: '跳到正文',
  brandHome: 'Sleep Pets & Chop Trees — 首页',
  nav: { home: '首页', guide: '指南', wildlife: '野生动物', gear: '装备', rewards: '奖励', faq: '常见问题', support: '帮助' },
  menu: '菜单',
  language: '语言',
  playOnRoblox: '在 Roblox 上玩',
  footerName: 'Sleep Pets & Chop Trees · 官方指南与帮助',
  footerLegal: '与 Roblox Corporation 无关。',

  heroTitle: '让野生宠物睡着，打造最温馨的牧场。',
  heroText: '用飞镖让野生动物睡着，把它们带回家，让它们在你的围栏里赚现金。砍树获得木材，然后通过转生解锁六个生物群系。',
  readGuide: '阅读指南',
  videoTitle: '和你一起成长的温馨牧场',
  videoText: '悄悄靠近野生动物，用飞镖让它们睡着，在它们醒来之前带回家。你放置的每只宠物都会赚现金，你可以同时砍树、升级和探索。',
  playNow: '立即开玩',
  firstRanch: '第一个牧场，一步一步来 →',
  videoSoon: '游戏视频即将推出',
  loopTitle: '牧场循环',
  loop: {
    sleep: { title: '催眠', text: '用飞镖枪瞄准，把睡眠进度填满到 100%。' },
    carry: { title: '搬运', text: '把它抱起来，在它醒来之前越过砖块边界。' },
    ranch: { title: '牧场', text: '放置的宠物会赚现金。喂养它们并购买属性。' },
    chop: { title: '砍树', text: '用近战工具砍树获得木材。金色的树给 5 倍。' },
    rebirth: { title: '转生', text: '花费现金、木材和指定的宠物来开启下一个生物群系。' },
  },
  biomesTitle: '六个生物群系等你探索',
  biomesText: '从阳光明媚的草原到发光的魔法树林，每次转生都会开启一个新世界。',
  biomesLabel: '生物群系',
  askTitle: '卡住了？问问 Pip。',
  askText: 'Pip 会根据官方游戏指南回答，并附上表格、图片和步骤。如果 Pip 找不到答案，团队里的真人会加入同一个聊天。',
  starters: ['怎么转生？', '雪地用什么枪最好？', '为什么我的宠物醒了？'],

  supportEyebrow: '帮助与支持',
  supportTitle: '我们能帮你什么？',
  supportLede: 'Pip 熟悉整本游戏指南，其他问题有团队的真人全天候在线帮你。',
  askPipTitle: '问 Pip',
  askPipText: '根据官方指南立即回答，附带表格、步骤和图片。',
  askQuestion: '提一个问题',
  personTitle: '联系真人',
  personText: '购买、漏洞、宠物丢失或账号问题。你会拿到一个工单号，并在同一个聊天里收到回复。',
  contactTeam: '联系团队',
  commonTitle: '常见问题',
  common: ['怎么转生？', '为什么我的宠物醒来跑掉了？', '免费奖励和兑换码在哪里？', '我购买的东西或游戏通行证不见了'],
  safetyLead: '注意安全：',
  safetyText: '团队绝不会向你索要密码、验证码或付款信息。免费 Robux（Roblox 的虚拟货币）的说法都是骗局。',

  notFoundTitle: '找不到页面',
  notFoundText: '这个页面跑进魔法树林里迷路了。',
  backHome: '回到牧场 →',

  loadingGuide: '正在加载指南…',
  inChapter: '本章内容',
  sectionsLabel: '小节',
  guideEyebrow: '指南',
  stillUnsure: '还是不确定？问问 Pip，它读过这本指南。',
  askPip: '问 Pip',

  chatWith: '和 Pip 聊天',
  launcherOpen: '问 Pip — 打开聊天',
  launcherDrag: '拖动 Pip 到任意一侧',
  launcherHi: '你好！我是 Pip',
  launcherAsk: '有问题尽管问',
  greeting: '你好，我是 Pip！关于 Sleep Pets & Chop Trees 的问题都可以问我。',
  thinking: ['正在读你的问题', '正在查找指南', '正在写回答'],
  thinkingLabel: 'Pip 正在查找指南',
  sending: '发送中…',
  ticket: '工单',
  connected: '已连接到团队',
  joining: '团队成员马上加入…',
  robloxUsername: 'Roblox 用户名',
  email: '邮箱',
  optional: '（可选）',
  helpWith: '你需要什么帮助？',
  sendToTeam: '发送给团队',
  cancel: '取消',
  handoffHint: '团队能看到这段聊天，所以你不用重复说明。千万不要分享你的密码。',
  wasHelpful: '这个回答有帮助吗？',
  helpful: '有帮助',
  notHelpful: '没帮助',
  team: '团队',
  supportName: '客服',
  offline: '暂时离线',
  online: '在线 · 根据官方指南回答',
  waking: '正在醒来…',
  resolved: '已解决',
  closeChat: '关闭聊天',
  joined: (name: string) => `${name} 加入了聊天`,
  aPerson: '团队成员',
  glad: '很高兴问题解决了！',
  ticketClosed: (ticket: string) => `工单 ${ticket} 已关闭。`,
  hereForElse: '还有其他问题随时问 Pip。',
  askElse: '问 Pip 别的问题',
  messagePip: '给 Pip 发消息',
  chatClosed: '这个聊天已关闭',
  messageTeam: '给团队发消息…',
  askGame: '问问关于游戏的问题…',
  send: '发送',
  systemNotes: { 'Player confirmed it’s solved': '玩家确认问题已解决' },

  errFast: (s: number) => `你发消息太快了，请 ${s} 秒后再试。`,
  errOffline: '你好像断网了。请检查网络后再试。',
  errGeneric: '出了点问题，请再试一次。',
  errStart: '无法开始聊天，请刷新页面。',
  errStatus: {
    400: '消息需要 1 到 1,000 个字。',
    404: '找不到这个聊天，请刷新页面。',
    409: '这个聊天已关闭。',
    502: '暂时联系不上团队，请一分钟后再试。',
  },
};

export const STRINGS: Record<Lang, Strings> = { en, zh };

const KEY = 'spct-lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    // storage blocked (private mode): fall through to the browser language
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

// Read by code outside React (API error text); kept in sync by the provider.
let current: Lang = 'en';
export const currentLang = () => current;
export const currentStrings = () => STRINGS[current];

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Strings }>({ lang: 'en', setLang: () => {}, t: en });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  current = lang;
  useEffect(() => {
    document.documentElement.lang = LANGS.find((l) => l.id === lang)!.htmlLang;
  }, [lang]);
  const value = useMemo(
    () => ({
      lang,
      t: STRINGS[lang],
      setLang: (l: Lang) => {
        setLangState(l);
        try {
          localStorage.setItem(KEY, l);
        } catch {
          // not saved; the choice still applies for this visit
        }
      },
    }),
    [lang],
  );
  return (
    <LangContext.Provider value={value}>
      <UiLabelsContext.Provider value={lang === 'zh' ? UI_ZH : UI_EN}>{children}</UiLabelsContext.Provider>
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

/** EN | 中文 segmented switch. */
export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t.language}>
      {LANGS.map((l) => (
        <button key={l.id} type="button" lang={l.htmlLang} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
