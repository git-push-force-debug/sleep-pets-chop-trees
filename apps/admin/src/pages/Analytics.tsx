import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { downloadCsv } from '../csv.ts';
import { adminApi } from '../data.ts';
import { CountUp, useToast } from '../motion.tsx';
import { currentStrings, useLang } from '../i18n.tsx';
import guideZh from '../../../../content/guide.public.zh.json' with { type: 'json' };
import type { Guide } from '../../../../packages/shared/src/guide.ts';

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
const OUTCOMES = ['', 'bot', 'handed', 'resolved'] as const;
const PAGES = ['', 'home', 'guide', 'support'] as const;
// Chinese section titles by anchor, for the most-used sections chart (stored replies keep the title they were sent with).
const ZH_TITLES = new Map((guideZh as Guide).chapters.flatMap((c) => c.sections.map((s) => [s.id, s.title])));
const DAY_MS = 24 * 60 * 60 * 1000;

const mins = (v: number | null) => {
  const t = currentStrings();
  return v === null ? '—' : v < 60 ? t.minutes(v) : t.hours((v / 60).toFixed(1));
};
const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : '—');

/** Horizontal bar chart: one labelled bar per item, scaled to the largest value. */
type Bar = { label: string; value: number; color?: string; href?: string; onClick?: () => void; active?: boolean };
function HBars({ items, label }: { items: Bar[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const { t } = useLang();
  if (!items.length) return <p className="hint">{t.nothingRange}</p>;
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
  const { t, lang } = useLang();
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
        toast(t.exportedMessages(rows.length));
      } else toast(t.noExport, 'error');
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
        <h1>{t.analytics}</h1>
        <button type="button" className="spct-pill spct-pill-secondary" disabled={exporting || !stats} onClick={() => void exportCsv()}>
          {exporting ? t.exporting : t.exportConversations}
        </button>
      </div>

      <div className="filters" role="group" aria-label={t.filters}>
        <label>{t.dateRange}
          <select value={range} onChange={(e) => { setRange(Number(e.target.value)); setDay(null); }}>
            {RANGES.map((d) => <option key={d} value={d}>{t.lastDays(d)}</option>)}
          </select>
        </label>
        <label>{t.outcome}
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            {OUTCOMES.map((v) => <option key={v} value={v}>{t.outcomes[v]}</option>)}
          </select>
        </label>
        <label>{t.askedFrom}
          <select value={page} onChange={(e) => setPage(e.target.value)}>
            {PAGES.map((v) => <option key={v} value={v}>{t.pages[v]}</option>)}
          </select>
        </label>
        {(day || outcome || page) && (
          <button type="button" className="chip-clear" onClick={() => { setDay(null); setOutcome(''); setPage(''); }}>
            {day ? t.dayChip(day.slice(5)) : ''}{t.clearFilters}
          </button>
        )}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}
      {!stats ? (
        <p className="hint">{t.loading}</p>
      ) : (
        <>
          <div className="tiles">
            {([
              [t.tiles.chats, String(total), ''],
              [t.tiles.pipOnly, pct(stats.botOnly, total), 'bot'],
              [t.tiles.handed, String(stats.handedOff), 'handed'],
              [t.tiles.firstReply, mins(stats.medianFirstReplyMinutes), null],
              [t.tiles.resolve, mins(stats.medianResolutionMinutes), 'resolved'],
              [t.tiles.helpful, `${stats.feedback.up} / ${stats.feedback.down}`, null],
            ] as const).map(([label, value, filter]) =>
              filter === null ? (
                <div key={label} className="tile"><span>{label}</span><b><CountUp value={value} /></b></div>
              ) : (
                <button key={label} type="button" className={`tile tile-btn ${outcome === filter ? 'on' : ''}`} aria-pressed={outcome === filter}
                  title={filter ? t.showOnly(label) : t.showAll} onClick={() => setOutcome(outcome === filter ? '' : filter)}>
                  <span>{label}</span><b><CountUp value={value} /></b>
                </button>
              ),
            )}
          </div>

          <div className="charts">
            <section className="card stack chart-wide">
              <h2>{t.chatsPerDay}</h2>
              <p className="legend"><i className="dot pip" /> {t.legendPip} <i className="dot person" /> {t.legendPerson}</p>
              <div className="bars" role="img" aria-label={stats.chatsPerDay.map((d) => t.daysAria(d.date, d.count, d.handed)).join(', ') || t.noChats}>
                {stats.chatsPerDay.map((d) => (
                  <button key={d.date} type="button" className={`bar-col ${day === d.date ? 'on' : ''}`} aria-pressed={day === d.date}
                    aria-label={t.dayAria(d.date, d.count, d.handed)}
                    title={t.dayTitle(d.date, d.count, d.handed)} onClick={() => setDay(day === d.date ? null : d.date)}>
                    <span className="bar-stack" style={{ height: `${(d.count / maxDay) * 100}%` }}>
                      <span className="bar person" style={{ flexGrow: d.handed }} />
                      <span className="bar" style={{ flexGrow: d.count - d.handed }} />
                    </span>
                    <small>{d.date.slice(5)}</small>
                  </button>
                ))}
                {stats.chatsPerDay.length === 0 && <p className="hint">{t.noChatsRange}</p>}
              </div>
            </section>

            <section className="card stack">
              <h2>{t.outcomesTitle}</h2>
              <HBars label={t.outcomesTitle} items={[
                { label: t.barPip, value: stats.outcomes.bot, color: 'var(--meadow)', active: outcome === 'bot', onClick: () => setOutcome(outcome === 'bot' ? '' : 'bot') },
                { label: t.barWaiting, value: stats.outcomes.waiting, color: 'var(--danger)', onClick: () => navigate('/leads?status=waiting_human') },
                { label: t.barTeam, value: stats.outcomes.team, color: 'var(--sky)', onClick: () => navigate('/leads?status=human') },
                { label: t.barResolved, value: stats.outcomes.resolved, color: 'var(--accent-deep)', active: outcome === 'resolved', onClick: () => setOutcome(outcome === 'resolved' ? '' : 'resolved') },
              ]} />
            </section>

            <section className="card stack">
              <h2>{t.helpfulTitle}</h2>
              <HBars label={t.feedback} items={[
                { label: t.helpful(pct(stats.feedback.up, votes)), value: stats.feedback.up, color: 'var(--meadow)' },
                { label: t.notHelpful(pct(stats.feedback.down, votes)), value: stats.feedback.down, color: 'var(--danger)' },
              ]} />
            </section>

            <section className="card stack chart-wide">
              <h2>{t.topSections}</h2>
              <HBars label={t.guideSections} items={stats.topSections.map((s) => ({ label: (lang === 'zh' && ZH_TITLES.get(s.url.split('#')[1] ?? '')) || s.title, value: s.count, href: s.url, color: 'var(--sky)' }))} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
