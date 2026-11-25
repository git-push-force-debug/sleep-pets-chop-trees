import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BotReply as Reply } from '../../../../packages/shared/src/blocks.ts';
import { BotReply } from '../../../../packages/shared/src/ui/BotReply.tsx';
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

function Conversation({ session, agent }: { session: SessionRow; agent: Agent }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('messages').select('*').eq('session_id', session.id).order('created_at');
    setMessages((data ?? []) as Msg[]);
  }, [session.id]);

  useEffect(() => {
    setSuggestion(null);
    void load();
    if (session.status !== 'bot') void adminApi('/admin/sync', { method: 'POST' }).then(load).catch(() => {});
    const channel = supabase
      .channel(`admin-msgs-${session.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${session.id}` }, () => void load())
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [session.id, session.status, load]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="conversation" aria-label="Conversation">
      <header className="conv-head">
        <div>
          <h2>{session.chatwoot_display_id ? `Ticket #${session.chatwoot_display_id}` : 'Bot chat'} · {session.roblox_username ?? 'Player'}</h2>
          <p className={`status-line s-${session.status}`}>{session.status.replace('_', ' ')}{session.handoff_at && session.status === 'waiting_human' ? ` · waiting ${waited(session.handoff_at)}` : ''}</p>
        </div>
        <div className="conv-actions">
          {session.chatwoot_display_id && (
            <a className="spct-pill spct-pill-green" href={chatwootUrl(session.chatwoot_display_id)} target="_blank" rel="noopener noreferrer">Open in Chatwoot ↗</a>
          )}
          {session.bot_paused && session.status !== 'resolved' && (
            <button type="button" className="spct-pill spct-pill-secondary" disabled={!!busy}
              onClick={() => run('back', () => adminApi(`/admin/sessions/${session.id}/hand-back`, { method: 'POST' }).then(() => {}))}>
              Hand back to bot
            </button>
          )}
        </div>
      </header>
      <div className="transcript">
        {messages.map((m) =>
          m.role === 'bot' && m.reply ? (
            <div key={m.id} className="t-bot"><span className="who">Pip · bot</span><BotReply reply={m.reply} onSuggestion={() => {}} onHandoff={() => {}} handoffDisabled /></div>
          ) : (
            <div key={m.id} className={`t-${m.role}`}>
              {m.role !== 'system' && <span className="who">{m.role === 'user' ? 'Player' : `${m.agent_name ?? 'Team'} · team`}</span>}
              <p>{m.content}</p>
            </div>
          ),
        )}
      </div>
      <div className="suggest">
        <button type="button" className="spct-pill spct-pill-secondary" disabled={!!busy}
          onClick={() => run('suggest', async () => setSuggestion((await adminApi<{ text: string }>(`/admin/sessions/${session.id}/suggest`, { method: 'POST' })).text))}>
          {busy === 'suggest' ? 'Thinking…' : 'Suggest reply'}
        </button>
        {suggestion && (
          <div className="suggestion">
            <b>Suggested reply · from the guide + creator notes</b>
            <p>{suggestion}</p>
            <button type="button" className="link-btn" onClick={() => void navigator.clipboard.writeText(suggestion)}>Copy</button>
          </div>
        )}
        {note && <p className="alert" role="alert">{note}</p>}
        <p className="hint">Reply, assign and resolve in Chatwoot — replies appear here and in the player's chat automatically. Signed in as {agent.display_name}.</p>
      </div>
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
                <span className="row-sub">{s.chatwoot_display_id ? `Ticket #${s.chatwoot_display_id}` : 'Bot only'} · {new Date(s.updated_at).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {session ? (
        <>
          <Conversation session={session} agent={agent} />
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
