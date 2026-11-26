import { useEffect, useState, type FormEvent } from 'react';
import { ZH_DEFAULTS } from '../../../../packages/shared/src/api.ts';
import { RaisedPill } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { adminApi } from '../data.ts';
import { useLang } from '../i18n.tsx';

interface S { botEnabled: boolean; greeting: string; starterQuestions: string[]; offlineMessage: string; greetingZh?: string; starterQuestionsZh?: string[]; offlineMessageZh?: string; evidenceThreshold: number; supportHours: string }

export function Settings() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { t } = useLang();
  useEffect(() => void adminApi<{ settings: S }>('/admin/settings').then((r) => setS(r.settings)).catch((e) => setMsg({ ok: false, text: e.message })), []);
  if (!s) return <div className="page"><h1>{t.settings}</h1>{msg ? <p className="alert" role="alert">{msg.text}</p> : <p className="hint">{t.loading}</p>}</div>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await adminApi('/admin/settings', { method: 'PUT', body: { ...s, starterQuestions: s.starterQuestions.filter((q) => q.trim()), starterQuestionsZh: (s.starterQuestionsZh ?? []).filter((q) => q.trim()) } });
      setMsg({ ok: true, text: t.saved });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  };
  const starters = [0, 1, 2].map((i) => s.starterQuestions[i] ?? '');
  const startersZh = [0, 1, 2].map((i) => s.starterQuestionsZh?.[i] ?? '');

  return (
    <form className="page stack card settings-form" onSubmit={save}>
      <h1>{t.settings}</h1>
      <label className="check"><input type="checkbox" checked={s.botEnabled} onChange={(e) => setS({ ...s, botEnabled: e.target.checked })} /> {t.botOn}</label>
      <label>{t.greeting}<input value={s.greeting} onChange={(e) => setS({ ...s, greeting: e.target.value })} maxLength={300} required /></label>
      {starters.map((q, i) => (
        <label key={i}>{t.starter(i + 1)}
          <input value={q} maxLength={80} onChange={(e) => setS({ ...s, starterQuestions: starters.map((x, j) => (j === i ? e.target.value : x)) })} />
        </label>
      ))}
      <label>{t.offlineMessage}<textarea value={s.offlineMessage} onChange={(e) => setS({ ...s, offlineMessage: e.target.value })} rows={2} maxLength={500} required /></label>
      <fieldset className="stack">
        <legend>{t.zhGroup}</legend>
        <label>{t.greetingZh}<input lang="zh-Hans" value={s.greetingZh ?? ''} placeholder={ZH_DEFAULTS.greeting} onChange={(e) => setS({ ...s, greetingZh: e.target.value })} maxLength={300} /></label>
        {startersZh.map((q, i) => (
          <label key={i}>{t.starterZh(i + 1)}
            <input lang="zh-Hans" value={q} placeholder={ZH_DEFAULTS.starterQuestions[i]} maxLength={80} onChange={(e) => setS({ ...s, starterQuestionsZh: startersZh.map((x, j) => (j === i ? e.target.value : x)) })} />
          </label>
        ))}
        <label>{t.offlineZh}<textarea lang="zh-Hans" value={s.offlineMessageZh ?? ''} placeholder={ZH_DEFAULTS.offlineMessage} onChange={(e) => setS({ ...s, offlineMessageZh: e.target.value })} rows={2} maxLength={500} /></label>
      </fieldset>
      <label>{t.supportHours}<input value={s.supportHours} onChange={(e) => setS({ ...s, supportHours: e.target.value })} maxLength={120} /></label>
      <label>{t.threshold(s.evidenceThreshold.toFixed(2))}
        <input type="range" min={0} max={1} step={0.05} value={s.evidenceThreshold} onChange={(e) => setS({ ...s, evidenceThreshold: Number(e.target.value) })} />
      </label>
      {msg && <p className={msg.ok ? 'ok' : 'alert'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <RaisedPill type="submit">{t.saveSettings}</RaisedPill>
    </form>
  );
}
