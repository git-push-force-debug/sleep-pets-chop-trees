import { useEffect, useState } from 'react';
import { adminApi } from '../data.ts';

interface Stats {
  chatsPerDay: { date: string; count: number }[];
  botOnly: number;
  handedOff: number;
  medianFirstReplyMinutes: number | null;
  medianResolutionMinutes: number | null;
  feedback: { up: number; down: number };
  topSections: { title: string; url: string; count: number }[];
}

const mins = (v: number | null) => (v === null ? '—' : v < 60 ? `${v} min` : `${(v / 60).toFixed(1)} h`);

export function Analytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => void adminApi<Stats>('/admin/stats').then(setStats).catch((e) => setError(e.message)), []);
  if (error) return <div className="page"><h1>Analytics</h1><p className="alert" role="alert">{error}</p></div>;
  if (!stats) return <div className="page"><h1>Analytics</h1><p className="hint">Loading…</p></div>;

  const total = stats.botOnly + stats.handedOff;
  const max = Math.max(1, ...stats.chatsPerDay.map((d) => d.count));
  const tiles = [
    { label: 'Chats (30 days)', value: String(total) },
    { label: 'Answered by Pip only', value: total ? `${Math.round((stats.botOnly / total) * 100)}%` : '—' },
    { label: 'Handed to a person', value: String(stats.handedOff) },
    { label: 'Median first reply', value: mins(stats.medianFirstReplyMinutes) },
    { label: 'Median time to resolve', value: mins(stats.medianResolutionMinutes) },
    { label: 'Helpful 👍 / 👎', value: `${stats.feedback.up} / ${stats.feedback.down}` },
  ];

  return (
    <div className="page stack">
      <h1>Analytics</h1>
      <div className="tiles">{tiles.map((t) => <div key={t.label} className="tile"><span>{t.label}</span><b>{t.value}</b></div>)}</div>
      <section className="card stack">
        <h2>Chats per day</h2>
        <div className="bars" role="img" aria-label={stats.chatsPerDay.map((d) => `${d.date}: ${d.count}`).join(', ') || 'No chats yet'}>
          {stats.chatsPerDay.map((d) => (
            <div key={d.date} className="bar-col" title={`${d.date}: ${d.count}`}>
              <span className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
              <small>{d.date.slice(5)}</small>
            </div>
          ))}
          {stats.chatsPerDay.length === 0 && <p className="hint">No chats yet.</p>}
        </div>
      </section>
      <section className="card stack">
        <h2>Most-used guide sections</h2>
        <ol className="plain">
          {stats.topSections.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> · {s.count}</li>)}
          {stats.topSections.length === 0 && <li className="hint">Nothing yet.</li>}
        </ol>
      </section>
    </div>
  );
}
