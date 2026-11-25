import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { BotReply as Reply } from '../../../../packages/shared/src/blocks.ts';
import { BotReply } from '../../../../packages/shared/src/ui/BotReply.tsx';
import { ticketLabel } from '../../../../packages/shared/src/api.ts';
import { chatwootUrl } from '../links.ts';
import { supabase, type Agent } from '../auth.ts';
import { adminApi, useSessions, type SessionRow } from '../data.ts';

const TABS: { key: string; label: string; statuses: SessionRow['status'][] }[] = [
  { key: 'waiting', label: 'Needs a person', statuses: ['waiting_human'] },
  { key: 'open', label: 'Open', statuses: ['human'] },
  { key: 'bot', label: 'Bot chats', statuses: ['bot'] },
  { key: 'resolved', label: 'Resolved', statuses: ['resolved'] },
];
const SYNC_MS = 20_000; // free Chatwoot plan: no webhooks, so the open panel batch-syncs

interface Msg { id: string; role: 'user' | 'bot' | 'agent' | 'system'; content: string; reply: Reply | null; agent_name: string | null; created_at: string }

const waited = (iso: string | null) => {
  if (!iso) return '';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return min < 60 ? `${min} min` : `${Math.round(min / 60)} h`;
};

function Conversation({ session, agent, onChanged }: { session: SessionRow; agent: Agent; onChanged: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
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

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setNote(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (e) {
      setNote((e as Error).message);
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
    <section className="conversation" aria-label="Conversation">
      <header className="conv-head">
        <div>
          <h2>{session.chatwoot_display_id ? `Ticket ${ticketLabel(session.chatwoot_display_id)}` : 'Bot chat'} · {session.roblox_username ?? 'Player'}</h2>
          <p className={`status-line s-${session.status}`}>{session.status.replace('_', ' ')}{session.handoff_at && session.status === 'waiting_human' ? ` · waiting ${waited(session.handoff_at)}` : ''}</p>
        </div>
        <div className="conv-actions">
          {!resolved && (
            <>
              <button type="button" className="spct-pill spct-pill-secondary" disabled={!!busy} onClick={() => run('ask', () => post('ask-resolved'))}>
                Ask if solved
              </button>
              <button type="button" className="spct-pill spct-pill-green" disabled={!!busy} onClick={() => run('resolve', () => post('resolve'))}>
                Resolve
              </button>
            </>
          )}
          {session.bot_paused && !resolved && (
            <button type="button" className="spct-pill spct-pill-secondary" disabled={!!busy} onClick={() => run('back', () => post('hand-back'))}>
              Hand back to Pip
            </button>
          )}
          {session.chatwoot_display_id && (
            <a className="spct-pill spct-pill-secondary" href={chatwootUrl(session.chatwoot_display_id)} target="_blank" rel="noopener noreferrer">Open in Chatwoot ↗</a>
          )}
        </div>
      </header>
      <div className="transcript" ref={transcript}>
        {messages.map((m) =>
          m.role === 'bot' && m.reply ? (
            <div key={m.id} className="t-bot"><span className="who">Pip · bot</span><BotReply reply={m.reply} onSuggestion={() => {}} onHandoff={() => {}} handoffDisabled showSuggestions={false} /></div>
          ) : (
            <div key={m.id} className={`t-${m.role}`}>
              {m.role !== 'system' && <span className="who">{m.role === 'user' ? session.roblox_username ?? 'Player' : `${m.agent_name ?? 'Team'} · team`}</span>}
              <p>{m.content}</p>
            </div>
          ),
        )}
      </div>
      <form className="reply-box" onSubmit={send}>
        <label className="spct-sr-only" htmlFor="admin-reply">Reply to the player</label>
        <textarea
          id="admin-reply"
          className="input reply-input"
          rows={3}
          maxLength={2000}
          value={draft}
          disabled={resolved}
          placeholder={resolved ? 'This chat is resolved.' : 'Reply to the player… (Enter sends, Shift+Enter for a new line)'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
        />
        <div className="reply-row">
          <button type="button" className="spct-pill spct-pill-secondary" disabled={!!busy || resolved}
            onClick={() => run('suggest', async () => setDraft((await adminApi<{ text: string }>(`/admin/sessions/${session.id}/suggest`, { method: 'POST' })).text))}>
            {busy === 'suggest' ? 'Thinking…' : 'Suggest reply'}
          </button>
          <span className="hint">Reply here or in Chatwoot — both reach the player. Signed in as {agent.display_name}.</span>
          <button type="submit" className="spct-pill spct-pill-primary" disabled={!draft.trim() || !!busy || resolved}>
            {busy === 'reply' ? 'Sending…' : 'Send'}
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
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void adminApi('/admin/sync', { method: 'POST' }).then(refresh).catch(() => {});
    }, SYNC_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const current = TABS.find((t) => t.key === tab)!;
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter(
      (s) => current.statuses.includes(s.status) && (!q || `${s.chatwoot_display_id ?? ''} ${s.roblox_username ?? ''} ${s.email ?? ''}`.toLowerCase().includes(q)),
    );
  }, [sessions, current, query]);
  const count = (t: (typeof TABS)[number]) => sessions.filter((s) => t.statuses.includes(s.status)).length;
  const session = sessions.find((s) => s.id === selected) ?? null;

  return (
    <div className="inbox">
      <section className="list-pane" aria-label="Conversations">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className="tab" onClick={() => setTab(t.key)}>
              {t.label} · {count(t)}
            </button>
          ))}
        </div>
        <label className="spct-sr-only" htmlFor="inbox-search">Search conversations</label>
        <input id="inbox-search" className="input" placeholder="Search ticket, username or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="rows">
          {list.length === 0 && <li className="empty">Nothing here right now.</li>}
          {list.map((s) => (
            <li key={s.id}>
              <button type="button" className={`row ${selected === s.id ? 'on' : ''}`} onClick={() => setSelected(s.id)}>
                <span className="row-top">
                  <b>{s.roblox_username ?? 'Player'}</b>
                  {s.status === 'waiting_human' && <span className="wait">⏱ {waited(s.handoff_at)}</span>}
                </span>
                <span className="row-sub">{s.chatwoot_display_id ? `Ticket ${ticketLabel(s.chatwoot_display_id)}` : 'Bot only'} · {new Date(s.updated_at).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {session ? (
        <>
          <Conversation session={session} agent={agent} onChanged={refresh} />
          <aside className="player" aria-label="Player">
            <h3>Player</h3>
            <dl>
              <dt>Roblox username</dt><dd>{session.roblox_username ?? '—'}</dd>
              <dt>Email</dt><dd>{session.email ?? 'Not given'}</dd>
              <dt>Asked from</dt><dd>{session.page_url ?? '—'}</dd>
              <dt>Device</dt><dd>{session.user_agent?.slice(0, 80) ?? '—'}</dd>
              <dt>Started</dt><dd>{new Date(session.created_at).toLocaleString()}</dd>
            </dl>
          </aside>
        </>
      ) : (
        <p className="pick">Pick a conversation.</p>
      )}
    </div>
  );
}
