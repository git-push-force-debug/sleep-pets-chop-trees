import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import type { BotReply as Reply } from '../../../../packages/shared/src/blocks.ts';
import { BotReply } from '../../../../packages/shared/src/ui/BotReply.tsx';
import { ticketLabel } from '../../../../packages/shared/src/api.ts';
import { chatwootUrl } from '../links.ts';
import { supabase, type Agent } from '../auth.ts';
import { adminApi, chatCode, useFirstQuestions, useSessions, type SessionRow } from '../data.ts';
import { useToast } from '../motion.tsx';
import { currentStrings, useLang } from '../i18n.tsx';

const TABS: { key: string; statuses: SessionRow['status'][] }[] = [
  { key: 'waiting', statuses: ['waiting_human'] },
  { key: 'open', statuses: ['human'] },
  { key: 'bot', statuses: ['bot'] },
  { key: 'resolved', statuses: ['resolved'] },
];
const SYNC_MS = 20_000; // free Chatwoot plan: no webhooks, so the open panel batch-syncs

interface Msg { id: string; role: 'user' | 'bot' | 'agent' | 'system'; content: string; reply: Reply | null; agent_name: string | null; created_at: string }

const waited = (iso: string | null) => {
  if (!iso) return '';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  const t = currentStrings();
  return min < 60 ? t.minutes(min) : t.hours(Math.round(min / 60));
};

function Conversation({ session, agent, onChanged }: { session: SessionRow; agent: Agent; onChanged: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { t } = useLang();
  const resolved = session.status === 'resolved';

  const load = useCallback(async () => {
    const { data } = await supabase.from('messages').select('*').eq('session_id', session.id).order('created_at');
    setMessages((data ?? []) as Msg[]);
  }, [session.id]);

  useEffect(() => {
    setDraft('');
    setNote(null);
    void load();
    if (session.status !== 'bot') void adminApi('/admin/sync', { method: 'POST' }).then(load).catch(() => {});
    const channel = supabase
      .channel(`admin-msgs-${session.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${session.id}` }, () => void load())
      .subscribe();
    // Fallback re-read in case realtime misses an insert (player messages, Chatwoot replies).
    const timer = setInterval(() => document.visibilityState === 'visible' && void load(), 4000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [session.id, session.status, load]);

  useEffect(() => {
    transcript.current?.scrollTo?.({ top: transcript.current.scrollHeight });
  }, [messages.length]);

  const DONE = t.done;
  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setNote(null);
    try {
      await fn();
      await load();
      onChanged();
      if (DONE[label]) toast(DONE[label]);
    } catch (e) {
      setNote((e as Error).message);
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };
  const post = (path: string, body?: unknown) => adminApi(`/admin/sessions/${session.id}/${path}`, { method: 'POST', body });

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy || resolved) return;
    void run('reply', async () => {
      const { message } = await adminApi<{ message: Msg }>(`/admin/sessions/${session.id}/reply`, { method: 'POST', body: { text } });
      setMessages((list) => (list.some((m) => m.id === message.id) ? list : [...list, message])); // show it at once
      setDraft('');
    });
  };

  return (
    <section className="conversation" aria-label={t.conversation}>
      <header className="conv-head">
        <div>
          <h2>{[session.roblox_username, session.chatwoot_display_id && t.ticket(ticketLabel(session.chatwoot_display_id)), t.chat(chatCode(session.id))].filter(Boolean).join(' · ')}</h2>
          <p className={`status-line s-${session.status}`}>{t.status[session.status]}{session.handoff_at && session.status === 'waiting_human' ? ` · ${t.waiting(waited(session.handoff_at))}` : ''}</p>
        </div>
        <div className="conv-actions">
          {!resolved && (
            <>
              <button type="button" className="spct-pill spct-pill-secondary" disabled={!!busy} onClick={() => run('ask', () => post('ask-resolved'))}>
                {t.askIfSolved}
              </button>
              <button type="button" className="spct-pill spct-pill-green" disabled={!!busy} onClick={() => run('resolve', () => post('resolve'))}>
                {t.resolve}
              </button>
            </>
          )}
          {session.bot_paused && !resolved && (
            <button type="button" className="spct-pill spct-pill-secondary" disabled={!!busy} onClick={() => run('back', () => post('hand-back'))}>
              {t.handBack}
            </button>
          )}
          {session.chatwoot_display_id && (
            <a className="spct-pill spct-pill-secondary" href={chatwootUrl(session.chatwoot_display_id)} target="_blank" rel="noopener noreferrer">{t.openChatwoot}</a>
          )}
        </div>
      </header>
      <div className="transcript" ref={transcript}>
        {messages.map((m) =>
          m.role === 'bot' && m.reply ? (
            <div key={m.id} className="t-bot"><span className="who">{t.pipBot}</span><BotReply reply={m.reply} onSuggestion={() => {}} onHandoff={() => {}} handoffDisabled showSuggestions={false} /></div>
          ) : (
            <div key={m.id} className={`t-${m.role}`}>
              {m.role !== 'system' && <span className="who">{m.role === 'user' ? session.roblox_username ?? t.player : t.teamSuffix(m.agent_name ?? t.teamName)}</span>}
              <p>{m.content}</p>
            </div>
          ),
        )}
      </div>
      <form className="reply-box" onSubmit={send}>
        <label className="spct-sr-only" htmlFor="admin-reply">{t.replyLabel}</label>
        <textarea
          id="admin-reply"
          className="input reply-input"
          rows={3}
          maxLength={2000}
          value={draft}
          disabled={resolved}
          placeholder={resolved ? t.chatResolved : t.replyPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
        />
        <div className="reply-row">
          <button type="button" className="spct-pill spct-pill-secondary" disabled={!!busy || resolved}
            onClick={() => run('suggest', async () => setDraft((await adminApi<{ text: string }>(`/admin/sessions/${session.id}/suggest`, { method: 'POST' })).text))}>
            {busy === 'suggest' ? t.thinking : t.suggestReply}
          </button>
          <span className="hint">{t.replyHint(agent.display_name)}</span>
          <button type="submit" className="spct-pill spct-pill-primary" disabled={!draft.trim() || !!busy || resolved}>
            {busy === 'reply' ? t.sending : t.send}
          </button>
        </div>
        {note && <p className="alert" role="alert">{note}</p>}
      </form>
    </section>
  );
}

export function Inbox({ agent }: { agent: Agent }) {
  const { sessions, refresh } = useSessions();
  const [tab, setTab] = useState('waiting');
  const [query, setQuery] = useState('');
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get('chat'));
  const { t, locale } = useLang();

  // Opened from the Leads page (/?chat=<id>): switch to the tab that holds that chat.
  const linked = params.get('chat');
  useEffect(() => {
    const s = linked && sessions.find((x) => x.id === linked);
    if (s) setTab(TABS.find((t) => t.statuses.includes(s.status))!.key);
  }, [linked, sessions]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void adminApi('/admin/sync', { method: 'POST' }).then(refresh).catch(() => {});
    }, SYNC_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const current = TABS.find((t) => t.key === tab)!;
  const first = useFirstQuestions(sessions);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Search by chat code (with or without #), ticket, username, email or the player's first question.
    const text = (s: SessionRow) =>
      `${chatCode(s.id)} ${chatCode(s.id).slice(1)} ${ticketLabel(s.chatwoot_display_id)} ${s.chatwoot_display_id ?? ''} ${s.roblox_username ?? ''} ${s.email ?? ''} ${first[s.id] ?? ''}`.toLowerCase();
    return sessions.filter((s) => current.statuses.includes(s.status) && (!q || text(s).includes(q)));
  }, [sessions, current, query, first]);
  const count = (tb: (typeof TABS)[number]) => sessions.filter((s) => tb.statuses.includes(s.status)).length;
  const session = sessions.find((s) => s.id === selected) ?? null;

  return (
    <div className="inbox">
      <section className="list-pane" aria-label={t.conversations}>
        <div className="tabs" role="tablist">
          {TABS.map((tb) => (
            <button key={tb.key} type="button" role="tab" aria-selected={tab === tb.key} className="tab" onClick={() => setTab(tb.key)}>
              {t.tabs[tb.key]} · {count(tb)}
            </button>
          ))}
        </div>
        <label className="spct-sr-only" htmlFor="inbox-search">{t.searchConversations}</label>
        <input id="inbox-search" className="input" placeholder={t.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="rows">
          {list.length === 0 && <li className="empty">{t.nothingHere}</li>}
          {list.map((s) => (
            <li key={s.id}>
              <button type="button" className={`row ${selected === s.id ? 'on' : ''}`} onClick={() => setSelected(s.id)}>
                <span className="row-top">
                  <b>{s.roblox_username ?? t.chat(chatCode(s.id))}</b>
                  {s.status === 'waiting_human' && <span className="wait">⏱ {waited(s.handoff_at)}</span>}
                </span>
                <span className="row-sub">
                  {[s.chatwoot_display_id ? t.ticket(ticketLabel(s.chatwoot_display_id)) : t.pipOnly, s.roblox_username && t.chat(chatCode(s.id)), new Date(s.updated_at).toLocaleString(locale)].filter(Boolean).join(' · ')}
                </span>
                {first[s.id] && <span className="row-preview">“{first[s.id]}”</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {session ? (
        <>
          <Conversation session={session} agent={agent} onChanged={refresh} />
          <aside className="player" aria-label={t.player}>
            <h3>{t.player}</h3>
            <dl>
              <dt>{t.playerPanel.chat}</dt><dd>{chatCode(session.id)}</dd>
              {session.chatwoot_display_id && <><dt>{t.playerPanel.ticket}</dt><dd>{ticketLabel(session.chatwoot_display_id)}</dd></>}
              <dt>{t.playerPanel.username}</dt><dd>{session.roblox_username ?? t.playerPanel.notGiven}</dd>
              <dt>{t.playerPanel.email}</dt><dd>{session.email ?? t.playerPanel.notGiven}</dd>
              <dt>{t.playerPanel.askedFrom}</dt><dd>{session.page_url ?? '—'}</dd>
              <dt>{t.playerPanel.device}</dt><dd>{session.user_agent?.slice(0, 80) ?? '—'}</dd>
              <dt>{t.playerPanel.started}</dt><dd>{new Date(session.created_at).toLocaleString(locale)}</dd>
              {first[session.id] && <><dt>{t.playerPanel.firstQuestion}</dt><dd>{first[session.id]}</dd></>}
            </dl>
          </aside>
        </>
      ) : (
        <p className="pick">{t.pick}</p>
      )}
    </div>
  );
}
