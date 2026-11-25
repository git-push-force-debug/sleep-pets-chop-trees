import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { RaisedPill } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { adminApi } from '../data.ts';

interface Member { user_id: string; role: 'admin' | 'agent'; display_name: string; email: string | null }

export function Team({ me }: { me: string }) {
  const [team, setTeam] = useState<Member[]>([]);
  const [form, setForm] = useState({ email: '', displayName: '', role: 'agent' as Member['role'] });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <h1>Team</h1>
      <p className="hint">Agents also need a seat in Chatwoot (free plan: 2 agents) to reply to players.</p>
      {error && <p className="alert" role="alert">{error}</p>}
      {created && (
        <div className="card notice" role="status">
          <b>Account created for {created.email}</b>
          <p>Temporary password (shown once — send it privately, and ask them to change it): <code>{created.password}</code></p>
          <button type="button" className="link-btn" onClick={() => setCreated(null)}>Done</button>
        </div>
      )}
      <form className="card row-wrap" onSubmit={add}>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Name<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required maxLength={60} /></label>
        <label>Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Member['role'] })}>
            <option value="agent">Agent</option><option value="admin">Admin</option>
          </select>
        </label>
        <RaisedPill type="submit">Add teammate</RaisedPill>
      </form>
      <table className="table">
        <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col"><span className="spct-sr-only">Actions</span></th></tr></thead>
        <tbody>
          {team.map((m) => (
            <tr key={m.user_id}>
              <td>{m.display_name}{m.user_id === me && ' (you)'}</td>
              <td>{m.email ?? '—'}</td>
              <td>
                <select aria-label={`Role for ${m.display_name}`} value={m.role} disabled={m.user_id === me}
                  onChange={(e) => void act(() => adminApi(`/admin/team/${m.user_id}`, { method: 'PATCH', body: { role: e.target.value } }))}>
                  <option value="agent">Agent</option><option value="admin">Admin</option>
                </select>
              </td>
              <td>
                {m.user_id !== me && (
                  <button type="button" className="link-btn danger"
                    onClick={() => confirm(`Remove ${m.display_name}? Their sign-in is deleted.`) && void act(() => adminApi(`/admin/team/${m.user_id}`, { method: 'DELETE' }))}>
                    Remove
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
