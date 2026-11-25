import { useEffect, useMemo, useState } from 'react';
import { downloadCsv } from '../csv.ts';
import { adminApi } from '../data.ts';

interface Stats {
  chatsPerDay: { date: string; count: number; handed: number }[];
  outcomes: { bot: number; waiting: number; team: number; resolved: number };
  botOnly: number;
  handedOff: number;
  medianFirstReplyMinutes: number | null;
  medianResolutionMinutes: number | null;
  feedback: { up: number; down: number };
  topSections: { title: string; url: string; count: number }[];
}

const RANGES = [7, 30, 90];
const OUTCOMES = [['', 'All outcomes'], ['bot', 'Pip only'], ['handed', 'Handed to a person'], ['resolved', 'Resolved']] as const;
const PAGES = [['', 'All pages'], ['home', 'Home'], ['guide', 'Guide'], ['support', 'Support']] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

const mins = (v: number | null) => (v === null ? '—' : v < 60 ? `${v} min` : `${(v / 60).toFixed(1)} h`);
const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : '—');

/** Horizontal bar chart: one labelled bar per item, scaled to the largest value. */
function HBars({ items, label }: { items: { label: string; value: number; color?: string; href?: string }[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="hint">Nothing in this range.</p>;
  return (
    <ul className="hbars" role="img" aria-label={`${label}: ${items.map((i) => `${i.label} ${i.value}`).join(', ')}`}>
      {items.map((i) => (
        <li key={i.label}>
          <span className="hbar-label">{i.href ? <a href={i.href} target="_blank" rel="noopener noreferrer">{i.label}</a> : i.label}</span>
          <span className="hbar-track"><span className="hbar" style={{ width: `${(i.value / max) * 100}%`, background: i.color }} /></span>
          <b>{i.value}</b>
        </li>
      ))}
    </ul>
  );
}

export function Analytics() {
  const [range, setRange] = useState(30);
  const [outcome, setOutcome] = useState('');
  const [page, setPage] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // The same three filters drive every tile, every chart and the export.
  const query = useMemo(() => {
    const q = new URLSearchParams({ from: new Date(Date.now() - range * DAY_MS).toISOString() });
    if (outcome) q.set('outcome', outcome);
    if (page) q.set('page', page);
    return q.toString();
  }, [range, outcome, page]);

  useEffect(() => {
    setError(null);
    adminApi<Stats>(`/admin/stats?${query}`).then(setStats).catch((e) => setError(e.message));
  }, [query]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { rows } = await adminApi<{ rows: Record<string, unknown>[] }>(`/admin/export/conversations?${query}`);
      if (rows.length) downloadCsv(`conversations-${new Date().toISOString().slice(0, 10)}.csv`, rows);
      else setError('No conversations match these filters.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const total = stats ? stats.botOnly + stats.handedOff : 0;
  const maxDay = Math.max(1, ...(stats?.chatsPerDay.map((d) => d.count) ?? []));
  const votes = stats ? stats.feedback.up + stats.feedback.down : 0;

  return (
    <div className="page stack">
      <div className="row-between">
        <h1>Analytics</h1>
        <button type="button" className="spct-pill spct-pill-secondary" disabled={exporting || !stats} onClick={() => void exportCsv()}>
          {exporting ? 'Exporting…' : 'Export conversations (CSV)'}
        </button>
      </div>

      <div className="filters" role="group" aria-label="Filters">
        <label>Date range
          <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
            {RANGES.map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </label>
        <label>Outcome
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            {OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Asked from
          <select value={page} onChange={(e) => setPage(e.target.value)}>
            {PAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}
      {!stats ? (
        <p className="hint">Loading…</p>
      ) : (
        <>
          <div className="tiles">
            {[
              ['Chats', String(total)],
              ['Answered by Pip only', pct(stats.botOnly, total)],
              ['Handed to a person', String(stats.handedOff)],
              ['Median first reply', mins(stats.medianFirstReplyMinutes)],
              ['Median time to resolve', mins(stats.medianResolutionMinutes)],
              ['Helpful 👍 / 👎', `${stats.feedback.up} / ${stats.feedback.down}`],
            ].map(([label, value]) => <div key={label} className="tile"><span>{label}</span><b>{value}</b></div>)}
          </div>

          <div className="charts">
            <section className="card stack chart-wide">
              <h2>Chats per day</h2>
              <p className="legend"><i className="dot pip" /> Pip only <i className="dot person" /> Handed to a person</p>
              <div className="bars" role="img" aria-label={stats.chatsPerDay.map((d) => `${d.date}: ${d.count} chats, ${d.handed} handed off`).join(', ') || 'No chats'}>
                {stats.chatsPerDay.map((d) => (
                  <div key={d.date} className="bar-col" title={`${d.date}: ${d.count} chats, ${d.handed} to a person`}>
                    <span className="bar-stack" style={{ height: `${(d.count / maxDay) * 100}%` }}>
                      <span className="bar person" style={{ flexGrow: d.handed }} />
                      <span className="bar" style={{ flexGrow: d.count - d.handed }} />
                    </span>
                    <small>{d.date.slice(5)}</small>
                  </div>
                ))}
                {stats.chatsPerDay.length === 0 && <p className="hint">No chats in this range.</p>}
              </div>
            </section>

            <section className="card stack">
              <h2>Outcomes</h2>
              <HBars label="Outcomes" items={[
                { label: 'Pip only', value: stats.outcomes.bot, color: 'var(--meadow)' },
                { label: 'Waiting for a person', value: stats.outcomes.waiting, color: 'var(--danger)' },
                { label: 'With the team', value: stats.outcomes.team, color: 'var(--sky)' },
                { label: 'Resolved', value: stats.outcomes.resolved, color: 'var(--accent-deep)' },
              ]} />
            </section>

            <section className="card stack">
              <h2>Helpful answers</h2>
              <HBars label="Feedback" items={[
                { label: `Helpful 👍 ${pct(stats.feedback.up, votes)}`, value: stats.feedback.up, color: 'var(--meadow)' },
                { label: `Not helpful 👎 ${pct(stats.feedback.down, votes)}`, value: stats.feedback.down, color: 'var(--danger)' },
              ]} />
            </section>

            <section className="card stack chart-wide">
              <h2>Most-used guide sections</h2>
              <HBars label="Guide sections" items={stats.topSections.map((s) => ({ label: s.title, value: s.count, href: s.url, color: 'var(--sky)' }))} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
