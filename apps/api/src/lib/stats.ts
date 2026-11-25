import type { MessageRow, SessionRow } from './store.ts';

const minutes = (from: string, to: string) => (new Date(to).getTime() - new Date(from).getTime()) / 60_000;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.round(value * 10) / 10;
}

export const OUTCOMES = ['bot', 'handed', 'resolved'] as const;
export const PAGES = ['home', 'guide', 'support'] as const;
export interface StatsFilter { outcome?: (typeof OUTCOMES)[number]; page?: (typeof PAGES)[number] }

/** The dashboard's shared filters: outcome (Pip only / handed to a person / resolved) and the page the chat started on. */
export function filterSessions(sessions: SessionRow[], { outcome, page }: StatsFilter): SessionRow[] {
  return sessions.filter((s) => {
    if (outcome === 'bot' && s.handoff_at) return false;
    if (outcome === 'handed' && !s.handoff_at) return false;
    if (outcome === 'resolved' && s.status !== 'resolved') return false;
    const path = s.page_url ?? '/';
    if (page === 'home' && path !== '/') return false;
    if (page === 'guide' && !path.startsWith('/guide')) return false;
    if (page === 'support' && !path.startsWith('/support')) return false;
    return true;
  });
}

export function computeStats(sessions: SessionRow[], messages: MessageRow[]) {
  const perDay = new Map<string, { count: number; handed: number }>();
  for (const s of sessions) {
    const day = perDay.get(s.created_at.slice(0, 10)) ?? { count: 0, handed: 0 };
    day.count += 1;
    if (s.handoff_at) day.handed += 1;
    perDay.set(s.created_at.slice(0, 10), day);
  }

  const handed = sessions.filter((s) => s.handoff_at);
  const firstReplies = handed.flatMap((s) => {
    const replies = messages
      .filter((m) => m.session_id === s.id && m.role === 'agent' && m.created_at >= s.handoff_at!)
      .map((m) => m.created_at)
      .sort();
    return replies.length ? [minutes(s.handoff_at!, replies[0]!)] : [];
  });
  const resolutions = handed.filter((s) => s.resolved_at).map((s) => minutes(s.handoff_at!, s.resolved_at!));

  const bot = messages.filter((m) => m.role === 'bot');
  const sections = new Map<string, { title: string; url: string; count: number }>();
  for (const m of bot) {
    for (const src of m.reply?.sources ?? []) {
      const entry = sections.get(src.url) ?? { title: src.title, url: src.url, count: 0 };
      entry.count += 1;
      sections.set(src.url, entry);
    }
  }

  return {
    chatsPerDay: [...perDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({ date, ...d })),
    outcomes: {
      bot: sessions.filter((s) => !s.handoff_at).length,
      waiting: sessions.filter((s) => s.status === 'waiting_human').length,
      team: sessions.filter((s) => s.handoff_at && s.status === 'human').length,
      resolved: sessions.filter((s) => s.status === 'resolved').length,
    },
    botOnly: sessions.length - handed.length,
    handedOff: handed.length,
    medianFirstReplyMinutes: median(firstReplies),
    medianResolutionMinutes: median(resolutions),
    feedback: { up: bot.filter((m) => m.feedback === 1).length, down: bot.filter((m) => m.feedback === -1).length },
    topSections: [...sections.values()].sort((a, b) => b.count - a.count).slice(0, 6),
  };
}
