import { useCallback, useEffect, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import guideJson from '../../../../content/guide.json' with { type: 'json' };
import type { Guide } from '../../../../packages/shared/src/guide.ts';
import { RaisedPill } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { adminApi } from '../data.ts';

const guide = guideJson as Guide; // full guide, including the admin-only creator chapter
interface Faq { id: string; question: string; answer: string; dify_segment_id: string | null }
interface Gap { id: string; question: string; top_score: number | null; created_at: string }

export function Knowledge() {
  const [faq, setFaq] = useState<Faq[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [draft, setDraft] = useState<{ id?: string; question: string; answer: string }>({ question: '', answer: '' });
  const [error, setError] = useState<string | null>(null);
  const [chapter, setChapter] = useState(guide.chapters[0]!.slug);

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
    if (!confirm('Delete this answer? Pip will stop using it.')) return;
    await adminApi(`/admin/faq/${id}`, { method: 'DELETE' });
    await load();
  };
  const resolveGap = async (id: string) => {
    await adminApi(`/admin/gaps/${id}/resolve`, { method: 'POST' });
    await load();
  };
  const current = guide.chapters.find((c) => c.slug === chapter)!;

  return (
    <div className="page stack">
      <h1>Knowledge</h1>
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card stack">
        <h2>Unanswered questions <span className="count">{gaps.length}</span></h2>
        <p className="hint">Questions Pip couldn't answer from the guide. Turn one into a team answer and Pip will use it.</p>
        <ul className="plain">
          {gaps.map((g) => (
            <li key={g.id} className="gap">
              <span>“{g.question}” <small>· {new Date(g.created_at).toLocaleDateString()}</small></span>
              <span className="gap-actions">
                <button type="button" className="link-btn" onClick={() => setDraft({ question: g.question, answer: '' })}>Turn into FAQ</button>
                <button type="button" className="link-btn" onClick={() => void resolveGap(g.id)}>Dismiss</button>
              </span>
            </li>
          ))}
          {gaps.length === 0 && <li className="hint">None — nice.</li>}
        </ul>
      </section>
      <section className="card stack">
        <h2>Team answers (FAQ)</h2>
        <form onSubmit={save} className="stack">
          <label>Question<input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} required minLength={3} maxLength={300} /></label>
          <label>Answer<textarea value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} rows={3} required minLength={3} maxLength={3000} /></label>
          <div className="row"><RaisedPill type="submit">{draft.id ? 'Save changes' : 'Add answer'}</RaisedPill>{draft.id && <button type="button" className="link-btn" onClick={() => setDraft({ question: '', answer: '' })}>Cancel</button>}</div>
        </form>
        <ul className="plain">
          {faq.map((f) => (
            <li key={f.id} className="faq">
              <b>{f.question}</b>
              <p>{f.answer}</p>
              <span className="gap-actions">
                <button type="button" className="link-btn" onClick={() => setDraft(f)}>Edit</button>
                <button type="button" className="link-btn" onClick={() => void remove(f.id)}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card stack">
        <h2>Game guide</h2>
        <label>Chapter
          <select value={chapter} onChange={(e) => setChapter(e.target.value as typeof chapter)}>
            {guide.chapters.map((c) => <option key={c.slug} value={c.slug}>{c.number} · {c.title}{c.internal ? ' (admin only)' : ''}</option>)}
          </select>
        </label>
        {current.sections.map((s) => (
          <details key={s.id} className="guide-sec">
            <summary>{s.title}</summary>
            <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{s.markdown.replace(/\[image:[a-z0-9-]+\]/g, '')}</ReactMarkdown></div>
          </details>
        ))}
      </section>
    </div>
  );
}
