import { useCallback, useEffect, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import guideJson from '../../../../content/guide.json' with { type: 'json' };
import creatorZh from '../../../../content/guide.creator.zh.json' with { type: 'json' };
import guideZhJson from '../../../../content/guide.public.zh.json' with { type: 'json' };
import type { Guide } from '../../../../packages/shared/src/guide.ts';
import { cjkEmphasis } from '../../../../packages/shared/src/ui/Markdown.tsx';
import { RaisedPill } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { adminApi } from '../data.ts';
import { useLang } from '../i18n.tsx';

const guide = guideJson as Guide; // full guide, including the admin-only creator chapter
// Same chapters in Chinese: the public translation plus the admin-only creator chapter.
const guideZh: Guide = { ...(guideZhJson as Guide), chapters: [...(guideZhJson as Guide).chapters, creatorZh as Guide['chapters'][number]] };
interface Faq { id: string; question: string; answer: string; dify_segment_id: string | null }
interface Gap { id: string; question: string; top_score: number | null; created_at: string }

export function Knowledge() {
  const [faq, setFaq] = useState<Faq[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [draft, setDraft] = useState<{ id?: string; question: string; answer: string }>({ question: '', answer: '' });
  const [error, setError] = useState<string | null>(null);
  const [chapter, setChapter] = useState(guide.chapters[0]!.slug);
  const { t, lang, locale } = useLang();
  const g = lang === 'zh' ? guideZh : guide;

  const load = useCallback(async () => {
    const [f, g] = await Promise.all([adminApi<{ entries: Faq[] }>('/admin/faq'), adminApi<{ gaps: Gap[] }>('/admin/gaps')]);
    setFaq(f.entries);
    setGaps(g.gaps);
  }, []);
  useEffect(() => void load().catch((e) => setError(e.message)), [load]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const body = { question: draft.question, answer: draft.answer };
      await adminApi(draft.id ? `/admin/faq/${draft.id}` : '/admin/faq', { method: draft.id ? 'PATCH' : 'POST', body });
      setDraft({ question: '', answer: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const remove = async (id: string) => {
    if (!confirm(t.confirmDeleteFaq)) return;
    await adminApi(`/admin/faq/${id}`, { method: 'DELETE' });
    await load();
  };
  const resolveGap = async (id: string) => {
    await adminApi(`/admin/gaps/${id}/resolve`, { method: 'POST' });
    await load();
  };
  const current = g.chapters.find((c) => c.slug === chapter) ?? guide.chapters.find((c) => c.slug === chapter)!;

  return (
    <div className="page stack knowledge">
      <h1>{t.knowledge}</h1>
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card stack">
        <h2>{t.gapsTitle} <span className="count">{gaps.length}</span></h2>
        <p className="hint">{t.gapsHint}</p>
        <ul className="plain">
          {gaps.map((gap) => (
            <li key={gap.id} className="gap">
              <span>“{gap.question}” <small>· {new Date(gap.created_at).toLocaleDateString(locale)}</small></span>
              <span className="gap-actions">
                <button type="button" className="link-btn" onClick={() => setDraft({ question: gap.question, answer: '' })}>{t.toFaq}</button>
                <button type="button" className="link-btn" onClick={() => void resolveGap(gap.id)}>{t.dismiss}</button>
              </span>
            </li>
          ))}
          {gaps.length === 0 && <li className="hint">{t.noGaps}</li>}
        </ul>
      </section>
      <section className="card stack">
        <h2>{t.faqTitle}</h2>
        <p className="hint">{t.faqLangHint}</p>
        <form onSubmit={save} className="stack">
          <label>{t.question}<input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} required minLength={3} maxLength={300} /></label>
          <label>{t.answer}<textarea value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} rows={3} required minLength={3} maxLength={3000} /></label>
          <div className="row"><RaisedPill type="submit">{draft.id ? t.saveChanges : t.addAnswer}</RaisedPill>{draft.id && <button type="button" className="link-btn" onClick={() => setDraft({ question: '', answer: '' })}>{t.cancel}</button>}</div>
        </form>
        <ul className="plain">
          {faq.map((f) => (
            <li key={f.id} className="faq">
              <b>{f.question}</b>
              <p>{f.answer}</p>
              <span className="gap-actions">
                <button type="button" className="link-btn" onClick={() => setDraft(f)}>{t.edit}</button>
                <button type="button" className="link-btn" onClick={() => void remove(f.id)}>{t.delete}</button>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card stack">
        <h2>{t.guideTitle}</h2>
        <label>{t.chapter}
          <select value={chapter} onChange={(e) => setChapter(e.target.value as typeof chapter)}>
            {g.chapters.map((c) => <option key={c.slug} value={c.slug}>{c.number} · {c.title}{c.internal ? t.adminOnly : ''}</option>)}
          </select>
        </label>
        {current.sections.map((s) => (
          <details key={s.id} className="guide-sec">
            <summary>{s.title}</summary>
            <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{cjkEmphasis(s.markdown.replace(/\[image:[a-z0-9-]+\]/g, ''))}</ReactMarkdown></div>
          </details>
        ))}
      </section>
    </div>
  );
}
