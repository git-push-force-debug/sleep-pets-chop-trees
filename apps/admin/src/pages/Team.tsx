import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { RaisedPill } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { adminApi } from '../data.ts';
import { useLang } from '../i18n.tsx';

interface Member { user_id: string; role: 'admin' | 'agent'; display_name: string; email: string | null }

export function Team({ me }: { me: string }) {
  const [team, setTeam] = useState<Member[]>([]);
  const [form, setForm] = useState({ email: '', displayName: '', role: 'agent' as Member['role'] });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLang();

  const load = useCallback(async () => setTeam((await adminApi<{ team: Member[] }>('/admin/team')).team), []);
  useEffect(() => void load().catch((e) => setError(e.message)), [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await adminApi<{ password: string }>('/admin/team', { method: 'POST', body: form });
      setCreated({ email: form.email, password: res.password });
      setForm({ email: '', displayName: '', role: 'agent' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="page stack">
      <h1>{t.team}</h1>
      <p className="hint">{t.teamHint}</p>
      {error && <p className="alert" role="alert">{error}</p>}
      {created && (
        <div className="card notice" role="status">
          <b>{t.created(created.email)}</b>
          <p>{t.tempPassword} <code>{created.password}</code></p>
          <button type="button" className="link-btn" onClick={() => setCreated(null)}>{t.ok}</button>
        </div>
      )}
      <form className="card row-wrap" onSubmit={add}>
        <label>{t.email}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>{t.name}<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required maxLength={60} /></label>
        <label>{t.roleLabel}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Member['role'] })}>
            <option value="agent">{t.roleTitle.agent}</option><option value="admin">{t.roleTitle.admin}</option>
          </select>
        </label>
        <RaisedPill type="submit">{t.addTeammate}</RaisedPill>
      </form>
      <table className="table">
        <thead><tr><th scope="col">{t.name}</th><th scope="col">{t.email}</th><th scope="col">{t.roleLabel}</th><th scope="col"><span className="spct-sr-only">{t.actions}</span></th></tr></thead>
        <tbody>
          {team.map((m) => (
            <tr key={m.user_id}>
              <td>{m.display_name}{m.user_id === me && t.you}</td>
              <td>{m.email ?? '—'}</td>
              <td>
                <select aria-label={t.roleFor(m.display_name)} value={m.role} disabled={m.user_id === me}
                  onChange={(e) => void act(() => adminApi(`/admin/team/${m.user_id}`, { method: 'PATCH', body: { role: e.target.value } }))}>
                  <option value="agent">{t.roleTitle.agent}</option><option value="admin">{t.roleTitle.admin}</option>
                </select>
              </td>
              <td>
                {m.user_id !== me && (
                  <button type="button" className="link-btn danger"
                    onClick={() => confirm(t.confirmRemove(m.display_name)) && void act(() => adminApi(`/admin/team/${m.user_id}`, { method: 'DELETE' }))}>
                    {t.remove}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
