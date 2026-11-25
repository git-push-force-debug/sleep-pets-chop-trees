import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage } from '../../../../packages/shared/src/api.ts';
import { BotReply } from '../../../../packages/shared/src/ui/BotReply.tsx';
import { BookIcon, CheckIcon, ClockIcon, CloseIcon, PersonIcon, SendIcon, ThumbIcon } from '../../../../packages/shared/src/ui/icons.tsx';
import { usePrefersReducedMotion } from '../../../../packages/shared/src/ui/motion.ts';
import { RaisedPill } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import type { Chat, HandoffForm } from './useChat.ts';

const Pip = ({ size = 44 }: { size?: number }) => (
  <span className="pip-avatar" style={{ width: size, height: size }} aria-hidden="true">
    <img src="/art/mascot.png" alt="" />
  </span>
);

function Status({ chat }: { chat: Chat }) {
  const s = chat.state.session;
  const agent = [...chat.state.messages].reverse().find((m) => m.role === 'agent')?.agentName;
  if (!s || s.status === 'bot') return <span className="chat-status"><BookIcon /> Bot · answers from the game guide</span>;
  if (s.status === 'waiting_human') return <span className="chat-status wait"><ClockIcon /> Waiting for a person · Ticket #{s.ticket}</span>;
  if (s.status === 'human') return <span className="chat-status ok"><CheckIcon size={14} /> {agent ?? 'A person'} from the team · Ticket #{s.ticket}</span>;
  return <span className="chat-status"><CheckIcon size={14} /> Resolved · Ticket #{s.ticket}</span>;
}

function Handoff({ chat, onDone }: { chat: Chat; onDone: () => void }) {
  const lastQuestion = [...chat.state.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const [form, setForm] = useState<HandoffForm>({ robloxUsername: '', email: '', summary: lastQuestion });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await chat.handoff(form)) onDone();
  };
  const set = (key: keyof HandoffForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  return (
    <motion.form className="handoff-form" onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <p className="handoff-title"><PersonIcon /> Talk to a person</p>
      <label>
        Roblox username
        <input value={form.robloxUsername} onChange={set('robloxUsername')} maxLength={50} autoComplete="username" />
      </label>
      <label>
        Email <span className="hint">(optional, for a reply if you leave)</span>
        <input type="email" value={form.email} onChange={set('email')} maxLength={200} autoComplete="email" />
      </label>
      <label>
        What do you need help with?
        <textarea value={form.summary} onChange={set('summary')} rows={2} maxLength={1000} required />
      </label>
      <div className="handoff-actions">
        <RaisedPill type="submit" disabled={chat.state.sending || !form.summary.trim()}>Send to the team</RaisedPill>
        <button type="button" className="link-btn" onClick={onDone}>Cancel</button>
      </div>
      <p className="hint">Your chat so far is shared with the team, so you won't need to repeat yourself. Never share your password.</p>
    </motion.form>
  );
}

function Message({ m, chat, animate, onHandoff }: { m: ChatMessage; chat: Chat; animate: boolean; onHandoff: () => void }) {
  if (m.role === 'user') return <div className="bubble me">{m.content}</div>;
  if (m.role === 'system') return <div className="system-note">{m.content}</div>;
  if (m.role === 'agent') {
    return (
      <div className="agent-msg">
        <span className="name-tag">{m.agentName ?? 'Support'} · team</span>
        <div className="bubble agent">{m.content}</div>
      </div>
    );
  }
  const paused = chat.state.session?.botPaused || chat.state.session?.status === 'resolved';
  return m.reply ? (
    <BotReply
      reply={m.reply}
      animate={animate}
      onSuggestion={(q) => void chat.send(q)}
      onHandoff={onHandoff}
      handoffDisabled={paused}
      footer={<Feedback chat={chat} m={m} />}
    />
  ) : (
    <div className="bubble bot">{m.content}</div>
  );
}

function Feedback({ chat, m }: { chat: Chat; m: ChatMessage }) {
  const [value, setValue] = useState(m.feedback);
  const rate = (v: 1 | -1) => {
    setValue(v);
    void chat.feedback(m.id, v);
  };
  return (
    <div className="feedback" role="group" aria-label="Was this helpful?">
      <button type="button" className="spct-icon-btn" aria-label="Helpful" aria-pressed={value === 1} onClick={() => rate(1)}><ThumbIcon /></button>
      <button type="button" className="spct-icon-btn" aria-label="Not helpful" aria-pressed={value === -1} onClick={() => rate(-1)}><ThumbIcon down /></button>
    </div>
  );
}

export function ChatPanel({ chat, onClose, variant = 'sheet' }: { chat: Chat; onClose?: () => void; variant?: 'sheet' | 'page' }) {
  const { session, messages, sending, error, ready, fresh } = chat.state;
  const [text, setText] = useState('');
  const [askingPerson, setAskingPerson] = useState(false);
  const [toast, setToast] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const reduced = usePrefersReducedMotion();
  const resolved = session?.status === 'resolved';
  const withPerson = session?.status === 'waiting_human' || session?.status === 'human';
  const agentCount = messages.filter((m) => m.role === 'agent').length;
  const seenAgents = useRef(agentCount);

  useEffect(() => {
    list.current?.scrollTo?.({ top: list.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages.length, sending, askingPerson, reduced]);

  // M4 toast on the first agent reply that arrives while the chat is open.
  useEffect(() => {
    if (agentCount > seenAgents.current && seenAgents.current === 0) {
      setToast(true);
      const t = setTimeout(() => setToast(false), 3500);
      seenAgents.current = agentCount;
      return () => clearTimeout(t);
    }
    seenAgents.current = agentCount;
  }, [agentCount]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending || resolved) return;
    setText('');
    void chat.send(value);
  };

  return (
    <section className={`chat-panel ${variant}`} aria-label="Chat with Pip">
      <header className="chat-head">
        <Pip />
        <div className="chat-title">
          <b>Pip</b>
          <Status chat={chat} />
        </div>
        {!withPerson && !resolved && !askingPerson && (
          <button type="button" className="mini-pill" onClick={() => setAskingPerson(true)}>Talk to a person</button>
        )}
        {onClose && (
          <button type="button" className="spct-icon-btn" aria-label="Close chat" onClick={onClose}><CloseIcon /></button>
        )}
      </header>

      <AnimatePresence>
        {toast && (
          <motion.div className="chat-toast" role="status" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <CheckIcon /> Connected to a person
          </motion.div>
        )}
      </AnimatePresence>

      <div className="chat-list" ref={list} aria-live="polite">
        {ready && messages.length === 0 && (
          <div className="chat-empty">
            <img src="/art/empty-chat.png" alt="" width="520" height="404" />
            <p>{chat.settings?.greeting ?? "Hi, I'm Pip! Ask me anything about Sleep Pets & Chop Trees."}</p>
            <div className="spct-chips">
              {(chat.settings?.starterQuestions ?? []).map((q) => (
                <button key={q} type="button" className="spct-chip" onClick={() => void chat.send(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {!ready && !error && <p className="chat-loading">Waking Pip up…</p>}
        {messages.map((m) => (
          <Message key={m.id} m={m} chat={chat} animate={fresh.includes(m.id)} onHandoff={() => setAskingPerson(true)} />
        ))}
        {sending && !askingPerson && (
          <div className="thinking" role="status"><Pip size={28} /> {withPerson ? 'Sending…' : 'Pip is looking in the guide…'}</div>
        )}
        {askingPerson && !withPerson && !resolved && <Handoff chat={chat} onDone={() => setAskingPerson(false)} />}
        {session?.status === 'waiting_human' && chat.settings?.offlineMessage && <p className="system-note">{chat.settings.offlineMessage}</p>}
        {resolved && (
          <div className="resolved-card">
            <p className="handoff-title"><CheckIcon /> This chat is closed</p>
            <p>Ticket #{session?.ticket} was resolved. Need something else? Start a fresh chat with Pip.</p>
            <RaisedPill onClick={() => void chat.startNew()}>Start new chat</RaisedPill>
          </div>
        )}
      </div>

      {error && <p className="chat-error" role="alert">{error}</p>}

      <form className="composer" onSubmit={submit}>
        <label htmlFor={`msg-${variant}`} className="spct-sr-only">Message Pip</label>
        <input
          id={`msg-${variant}`}
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={resolved ? 'This chat is closed' : withPerson ? 'Message the team…' : 'Ask about the game…'}
          maxLength={1000}
          disabled={resolved || !ready}
          autoComplete="off"
        />
        <button type="submit" className="send-btn" aria-label="Send" disabled={resolved || !text.trim() || sending}>
          <SendIcon />
        </button>
      </form>
    </section>
  );
}
