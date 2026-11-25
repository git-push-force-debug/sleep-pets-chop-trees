import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ticketLabel } from '../../../../packages/shared/src/api.ts';
import { downloadCsv } from '../csv.ts';
import { useSessions, type SessionRow } from '../data.ts';

const STATUS: Record<SessionRow['status'], string> = { waiting_human: 'Waiting', human: 'With the team', resolved: 'Resolved', bot: 'Back with Pip' };

/** Leads = players who asked for a person; the hand-off form captures their Roblox username and email. */
export function Leads() {
  const { sessions } = useSessions(1000);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const leads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => s.handoff_at)
      .filter((s) => !status || s.status === status)
      .filter((s) => !q || `${s.roblox_username ?? ''} ${s.email ?? ''} ${ticketLabel(s.chatwoot_display_id)}`.toLowerCase().includes(q))
      .sort((a, b) => b.handoff_at!.localeCompare(a.handoff_at!));
  }, [sessions, query, status]);

  const exportCsv = () =>
    downloadCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, leads.map((s) => ({
      date: s.handoff_at,
      roblox_username: s.roblox_username ?? '',
      email: s.email ?? '',
      ticket: ticketLabel(s.chatwoot_display_id),
      status: STATUS[s.status],
      asked_from: s.page_url ?? '',
      resolved_at: s.resolved_at ?? '',
    })));

  return (
    <div className="page stack leads-page">
      <div className="row-between">
        <h1>Leads · {leads.length}</h1>
        <button type="button" className="spct-pill spct-pill-secondary" disabled={!leads.length} onClick={exportCsv}>Export leads (CSV)</button>
      </div>
      <p className="hint">Players who asked for a person. The hand-off form captures their Roblox username and email.</p>
      <div className="filters" role="group" aria-label="Filters">
        <label>Search
          <input placeholder="Username, email or ticket" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="waiting_human">Waiting</option>
            <option value="human">With the team</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Roblox username</th><th>Email</th><th>Ticket</th><th>Status</th><th>Asked from</th><th /></tr>
          </thead>
          <tbody>
            {leads.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.handoff_at!).toLocaleString()}</td>
                <td>{s.roblox_username ?? '—'}</td>
                <td>{s.email ?? '—'}</td>
                <td>{ticketLabel(s.chatwoot_display_id) || '—'}</td>
                <td className={`s-${s.status}`}>{STATUS[s.status]}</td>
                <td>{s.page_url ?? '—'}</td>
                <td><Link to={`/?chat=${s.id}`}>Open chat</Link></td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={7} className="hint">No leads match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
