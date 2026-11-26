import { useEffect, useState, type FormEvent } from 'react';
import { RaisedPill } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { adminApi } from '../data.ts';

interface S { botEnabled: boolean; greeting: string; starterQuestions: string[]; offlineMessage: string; evidenceThreshold: number; supportHours: string }

export function Settings() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => void adminApi<{ settings: S }>('/admin/settings').then((r) => setS(r.settings)).catch((e) => setMsg({ ok: false, text: e.message })), []);
  if (!s) return <div className="page"><h1>Settings</h1>{msg ? <p className="alert" role="alert">{msg.text}</p> : <p className="hint">Loading…</p>}</div>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await adminApi('/admin/settings', { method: 'PUT', body: { ...s, starterQuestions: s.starterQuestions.filter((q) => q.trim()) } });
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  };
  const starters = [0, 1, 2].map((i) => s.starterQuestions[i] ?? '');

  return (
    <form className="page stack card settings-form" onSubmit={save}>
      <h1>Settings</h1>
      <label className="check"><input type="checkbox" checked={s.botEnabled} onChange={(e) => setS({ ...s, botEnabled: e.target.checked })} /> Pip answers players (off = every message offers a person)</label>
      <label>Greeting<input value={s.greeting} onChange={(e) => setS({ ...s, greeting: e.target.value })} maxLength={300} required /></label>
      {starters.map((q, i) => (
        <label key={i}>Starter question {i + 1}
          <input value={q} maxLength={80} onChange={(e) => setS({ ...s, starterQuestions: starters.map((x, j) => (j === i ? e.target.value : x)) })} />
        </label>
      ))}
      <label>Waiting / offline message<textarea value={s.offlineMessage} onChange={(e) => setS({ ...s, offlineMessage: e.target.value })} rows={2} maxLength={500} required /></label>
      <label>Support hours<input value={s.supportHours} onChange={(e) => setS({ ...s, supportHours: e.target.value })} maxLength={120} /></label>
      <label>Evidence threshold ({s.evidenceThreshold.toFixed(2)}) — lower answers more, higher hands off more
        <input type="range" min={0} max={1} step={0.05} value={s.evidenceThreshold} onChange={(e) => setS({ ...s, evidenceThreshold: Number(e.target.value) })} />
      </label>
      {msg && <p className={msg.ok ? 'ok' : 'alert'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <RaisedPill type="submit">Save settings</RaisedPill>
    </form>
  );
}
