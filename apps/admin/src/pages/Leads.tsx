import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ticketLabel } from '../../../../packages/shared/src/api.ts';
import { downloadCsv } from '../csv.ts';
import { chatCode, useSessions } from '../data.ts';
import { useToast } from '../motion.tsx';
import { useLang } from '../i18n.tsx';


/** Leads = players who asked for a person; the hand-off form captures their Roblox username and email. */
export function Leads() {
  const { sessions } = useSessions(1000);
  const toast = useToast();
  const { t, locale } = useLang();
  const [query, setQuery] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(params.get('status') ?? ''); // dashboard drill-in: /leads?status=waiting_human

  const leads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => s.handoff_at)
      .filter((s) => !status || s.status === status)
      .filter((s) => !q || `${s.roblox_username ?? ''} ${s.email ?? ''} ${ticketLabel(s.chatwoot_display_id)} ${chatCode(s.id)}`.toLowerCase().includes(q))
      .sort((a, b) => b.handoff_at!.localeCompare(a.handoff_at!));
  }, [sessions, query, status]);

  const exportCsv = () => {
    toast(t.exportedLeads(leads.length));
    const c = t.csvLeads;
    downloadCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, leads.map((s) => ({
      [c.date]: s.handoff_at,
      [c.roblox_username]: s.roblox_username ?? '',
      [c.email]: s.email ?? '',
      [c.ticket]: ticketLabel(s.chatwoot_display_id),
      [c.chat]: chatCode(s.id),
      [c.status]: t.leadStatus[s.status],
      [c.asked_from]: s.page_url ?? '',
      [c.resolved_at]: s.resolved_at ?? '',
    })));
  };

  return (
    <div className="page stack leads-page">
      <div className="row-between">
        <h1>{t.leadsTitle(leads.length)}</h1>
        <button type="button" className="spct-pill spct-pill-secondary" disabled={!leads.length} onClick={exportCsv}>{t.exportLeads}</button>
      </div>
      <p className="hint">{t.leadsHint}</p>
      <div className="filters" role="group" aria-label={t.filters}>
        <label>{t.search}
          <input placeholder={t.leadsSearch} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>{t.statusLabel}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t.all}</option>
            <option value="waiting_human">{t.leadStatus.waiting_human}</option>
            <option value="human">{t.leadStatus.human}</option>
            <option value="resolved">{t.leadStatus.resolved}</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>{t.cols.date}</th><th>{t.cols.username}</th><th>{t.cols.email}</th><th>{t.cols.ticket}</th><th>{t.cols.chat}</th><th>{t.cols.status}</th><th>{t.cols.askedFrom}</th><th /></tr>
          </thead>
          <tbody>
            {leads.map((s) => (
              <tr key={s.id} className="click-row" onClick={() => navigate(`/?chat=${s.id}`)}>
                <td>{new Date(s.handoff_at!).toLocaleString(locale)}</td>
                <td>{s.roblox_username ?? '—'}</td>
                <td>{s.email ?? '—'}</td>
                <td>{ticketLabel(s.chatwoot_display_id) || '—'}</td>
                <td>{chatCode(s.id)}</td>
                <td className={`s-${s.status}`}>{t.leadStatus[s.status]}</td>
                <td>{s.page_url ?? '—'}</td>
                <td><Link to={`/?chat=${s.id}`}>{t.openChat}</Link></td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={8} className="hint">{t.noLeads}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
