import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { downloadCsv } from '../csv.ts';
import { adminApi } from '../data.ts';
import { CountUp, useToast } from '../motion.tsx';

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
type Bar = { label: string; value: number; color?: string; href?: string; onClick?: () => void; active?: boolean };
function HBars({ items, label }: { items: Bar[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="hint">Nothing in this range.</p>;
  return (
    <ul className="hbars" role="img" aria-label={`${label}: ${items.map((i) => `${i.label} ${i.value}`).join(', ')}`}>
      {items.map((i) => (
        <li key={i.label} className={i.active ? 'on' : ''}>
          {i.onClick ? (
            <button type="button" className="hbar-label hbar-btn" onClick={i.onClick} aria-pressed={!!i.active}>{i.label}</button>
          ) : (
            <span className="hbar-label">{i.href ? <a href={i.href} target="_blank" rel="noopener noreferrer">{i.label}</a> : i.label}</span>
          )}
          <span className="hbar-track"><span className="hbar" style={{ width: `${(i.value / max) * 100}%`, background: i.color }} /></span>
          <b><CountUp value={String(i.value)} /></b>
        </li>
      ))}
    </ul>
  );
}

export function Analytics() {
  const [range, setRange] = useState(30);
  const [outcome, setOutcome] = useState('');
  const [page, setPage] = useState('');
  const [day, setDay] = useState<string | null>(null); // a clicked day bar narrows every chart to that day
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // The same three filters drive every tile, every chart and the export.
  const query = useMemo(() => {
    const q = day
      ? new URLSearchParams({ from: new Date(`${day}T00:00:00Z`).toISOString(), to: new Date(new Date(`${day}T00:00:00Z`).getTime() + DAY_MS).toISOString() })
      : new URLSearchParams({ from: new Date(Date.now() - range * DAY_MS).toISOString() });
    if (outcome) q.set('outcome', outcome);
    if (page) q.set('page', page);
    return q.toString();
  }, [range, outcome, page, day]);

  useEffect(() => {
    setError(null);
    adminApi<Stats>(`/admin/stats?${query}`).then(setStats).catch((e) => setError(e.message));
  }, [query]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { rows } = await adminApi<{ rows: Record<string, unknown>[] }>(`/admin/export/conversations?${query}`);
      if (rows.length) {
        downloadCsv(`conversations-${new Date().toISOString().slice(0, 10)}.csv`, rows);
        toast(`Exported ${rows.length} messages`);
      } else toast('No conversations match these filters.', 'error');
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
          <select value={range} onChange={(e) => { setRange(Number(e.target.value)); setDay(null); }}>
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
        {(day || outcome || page) && (
          <button type="button" className="chip-clear" onClick={() => { setDay(null); setOutcome(''); setPage(''); }}>
            {day ? `Day ${day.slice(5)} · ` : ''}Clear filters ×
          </button>
        )}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}
      {!stats ? (
        <p className="hint">Loading…</p>
      ) : (
        <>
          <div className="tiles">
            {([
              ['Chats', String(total), ''],
              ['Answered by Pip only', pct(stats.botOnly, total), 'bot'],
              ['Handed to a person', String(stats.handedOff), 'handed'],
              ['Median first reply', mins(stats.medianFirstReplyMinutes), null],
              ['Median time to resolve', mins(stats.medianResolutionMinutes), 'resolved'],
              ['Helpful 👍 / 👎', `${stats.feedback.up} / ${stats.feedback.down}`, null],
            ] as const).map(([label, value, filter]) =>
              filter === null ? (
                <div key={label} className="tile"><span>{label}</span><b><CountUp value={value} /></b></div>
              ) : (
                <button key={label} type="button" className={`tile tile-btn ${outcome === filter ? 'on' : ''}`} aria-pressed={outcome === filter}
                  title={filter ? `Show only: ${label}` : 'Show all outcomes'} onClick={() => setOutcome(outcome === filter ? '' : filter)}>
                  <span>{label}</span><b><CountUp value={value} /></b>
                </button>
              ),
            )}
          </div>

          <div className="charts">
            <section className="card stack chart-wide">
              <h2>Chats per day</h2>
              <p className="legend"><i className="dot pip" /> Pip only <i className="dot person" /> Handed to a person</p>
              <div className="bars" role="img" aria-label={stats.chatsPerDay.map((d) => `${d.date}: ${d.count} chats, ${d.handed} handed off`).join(', ') || 'No chats'}>
                {stats.chatsPerDay.map((d) => (
                  <button key={d.date} type="button" className={`bar-col ${day === d.date ? 'on' : ''}`} aria-pressed={day === d.date}
                    aria-label={`${d.date}: ${d.count} chats, ${d.handed} handed to a person. Show only this day`}
                    title={`${d.date}: ${d.count} chats, ${d.handed} to a person — click to show only this day`} onClick={() => setDay(day === d.date ? null : d.date)}>
                    <span className="bar-stack" style={{ height: `${(d.count / maxDay) * 100}%` }}>
                      <span className="bar person" style={{ flexGrow: d.handed }} />
                      <span className="bar" style={{ flexGrow: d.count - d.handed }} />
                    </span>
                    <small>{d.date.slice(5)}</small>
                  </button>
                ))}
                {stats.chatsPerDay.length === 0 && <p className="hint">No chats in this range.</p>}
              </div>
            </section>

            <section className="card stack">
              <h2>Outcomes</h2>
              <HBars label="Outcomes" items={[
                { label: 'Pip only', value: stats.outcomes.bot, color: 'var(--meadow)', active: outcome === 'bot', onClick: () => setOutcome(outcome === 'bot' ? '' : 'bot') },
                { label: 'Waiting for a person →', value: stats.outcomes.waiting, color: 'var(--danger)', onClick: () => navigate('/leads?status=waiting_human') },
                { label: 'With the team →', value: stats.outcomes.team, color: 'var(--sky)', onClick: () => navigate('/leads?status=human') },
                { label: 'Resolved', value: stats.outcomes.resolved, color: 'var(--accent-deep)', active: outcome === 'resolved', onClick: () => setOutcome(outcome === 'resolved' ? '' : 'resolved') },
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
