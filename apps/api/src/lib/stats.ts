import type { MessageRow, SessionRow } from './store.ts';

const minutes = (from: string, to: string) => (new Date(to).getTime() - new Date(from).getTime()) / 60_000;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.round(value * 10) / 10;
}

export function computeStats(sessions: SessionRow[], messages: MessageRow[]) {
  const perDay = new Map<string, number>();
  for (const s of sessions) perDay.set(s.created_at.slice(0, 10), (perDay.get(s.created_at.slice(0, 10)) ?? 0) + 1);

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
    chatsPerDay: [...perDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    botOnly: sessions.length - handed.length,
    handedOff: handed.length,
    medianFirstReplyMinutes: median(firstReplies),
    medianResolutionMinutes: median(resolutions),
    feedback: { up: bot.filter((m) => m.feedback === 1).length, down: bot.filter((m) => m.feedback === -1).length },
    topSections: [...sections.values()].sort((a, b) => b.count - a.count).slice(0, 5),
  };
}
