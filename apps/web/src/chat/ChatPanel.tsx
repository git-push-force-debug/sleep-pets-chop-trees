import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ticketLabel, type ChatMessage } from '../../../../packages/shared/src/api.ts';
import { BotReply } from '../../../../packages/shared/src/ui/BotReply.tsx';
import { CheckIcon, CloseIcon, PersonIcon, SendIcon, ThumbIcon } from '../../../../packages/shared/src/ui/icons.tsx';
import { usePrefersReducedMotion } from '../../../../packages/shared/src/ui/motion.ts';
import { RaisedPill } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import type { Chat, HandoffForm } from './useChat.ts';

const Pip = ({ size = 44, pose = 'mascot' }: { size?: number; pose?: 'mascot' | 'think' | 'headset' }) => (
  <span className={`pip-avatar ${pose !== 'mascot' ? 'pose' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
    <img src={pose === 'mascot' ? '/art/mascot.png' : `/art/v2/pip-${pose}.webp`} alt="" onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')} />
  </span>
);

const THINKING_STEPS = ['Reading your question', 'Searching the guide', 'Writing the answer'];

/** Pip's thinking state: bobbing avatar, staged steps (M10) and shimmering placeholder cards (M8). */
function Thinking({ toPerson }: { toPerson: boolean }) {
  const [step, setStep] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (toPerson) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1)), 1300);
    return () => clearInterval(t);
  }, [toPerson]);
  if (toPerson) return <div className="thinking" role="status"><Pip size={28} /> Sending…</div>;
  return (
    <div className="thinking-card" role="status" aria-label="Pip is looking in the guide">
      <div className="thinking-head">
        <Pip size={40} pose="think" />
        <ol className="thinking-steps">
          {THINKING_STEPS.map((label, i) => (
            <li key={label} className={i < step ? 'done' : i === step ? 'now' : ''}>
              <span className="dot" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ol>
      </div>
      {!reduced && (
        <div className="skeletons" aria-hidden="true">
          <span style={{ width: '92%' }} />
          <span style={{ width: '74%' }} />
          <span className="block" />
        </div>
      )}
    </div>
  );
}

/** In-chat ticket: shows the full ticket number and a live "joining" pulse until a person replies. */
function TicketCard({ chat }: { chat: Chat }) {
  const s = chat.state.session!;
  const agent = [...chat.state.messages].reverse().find((m) => m.role === 'agent')?.agentName;
  return (
    <motion.div className="ticket-card" initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
      <Pip size={40} pose="headset" />
      <div>
        <b>Ticket {ticketLabel(s.ticket)}</b>
        <span>Connected to the team</span>
        {agent ? (
          <span className="joined"><CheckIcon size={14} /> {agent} joined the chat</span>
        ) : (
          <span className="joining"><span className="pulse" aria-hidden="true" />A person is joining…</span>
        )}
      </div>
    </motion.div>
  );
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
        Email <span className="hint">(optional)</span>
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
      <p className="hint">The team sees this chat, so you won't need to repeat yourself. Never share your password.</p>
    </motion.form>
  );
}

const BURST = [0, 60, 120, 180, 240, 300];

function Feedback({ chat, m }: { chat: Chat; m: ChatMessage }) {
  const [value, setValue] = useState(m.feedback);
  const [burst, setBurst] = useState(0);
  const reduced = usePrefersReducedMotion();
  const rate = (v: 1 | -1) => {
    setValue(v);
    setBurst((b) => b + 1);
    void chat.feedback(m.id, v);
  };
  const thumb = (v: 1 | -1, label: string) => (
    <motion.button
      type="button"
      className={`thumb ${value === v ? 'on' : ''}`}
      aria-label={label}
      aria-pressed={value === v}
      onClick={() => rate(v)}
      whileTap={reduced ? undefined : { scale: 0.8 }}
      animate={value === v && !reduced ? { scale: [1, 1.3, 1], rotate: v === 1 ? [0, -14, 0] : [0, 14, 0] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <ThumbIcon down={v === -1} />
      <AnimatePresence>
        {value === v && !reduced && burst > 0 && (
          <span key={burst} className="burst" aria-hidden="true">
            {BURST.map((deg) => (
              <motion.i key={deg} initial={{ opacity: 1, x: 0, y: 0 }} animate={{ opacity: 0, x: Math.cos((deg * Math.PI) / 180) * 18, y: Math.sin((deg * Math.PI) / 180) * 18 }} transition={{ duration: 0.5 }} />
            ))}
          </span>
        )}
      </AnimatePresence>
    </motion.button>
  );
  return (
    <div className="feedback" role="group" aria-label="Was this helpful?">
      {thumb(1, 'Helpful')}
      {thumb(-1, 'Not helpful')}
    </div>
  );
}

function Message({ m, chat, animate, onHandoff }: { m: ChatMessage; chat: Chat; animate: boolean; onHandoff: () => void }) {
  if (m.role === 'user') return <div className="bubble me">{m.content}</div>;
  if (m.role === 'system') return <div className="system-note">{m.content}</div>;
  if (m.role === 'agent') {
    return (
      <motion.div className="agent-msg" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <span className="name-tag">{m.agentName ?? 'Support'} · team</span>
        <div className="bubble agent">{m.content}</div>
      </motion.div>
    );
  }
  const paused = chat.state.session?.botPaused || chat.state.session?.status === 'resolved';
  return m.reply ? (
    <BotReply
      reply={m.reply}
      animate={animate}
      onDone={animate ? () => chat.markPlayed(m.id) : undefined}
      onSuggestion={(q) => void chat.send(q)}
      onHandoff={onHandoff}
      handoffDisabled={paused}
      footer={<Feedback chat={chat} m={m} />}
    />
  ) : (
    <div className="bubble bot">{m.content}</div>
  );
}

export function ChatPanel({ chat, onClose, variant = 'sheet', handoffSignal = 0 }: { chat: Chat; onClose?: () => void; variant?: 'sheet' | 'page'; handoffSignal?: number }) {
  const { session, messages, sending, error, ready, fresh } = chat.state;
  const [text, setText] = useState('');
  const [askingPerson, setAskingPerson] = useState(false);
  const [toast, setToast] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const resolved = session?.status === 'resolved';
  const withPerson = session?.status === 'waiting_human' || session?.status === 'human';
  const agentCount = messages.filter((m) => m.role === 'agent').length;
  const seenAgents = useRef(agentCount);
  const agentName = [...messages].reverse().find((m) => m.role === 'agent')?.agentName;

  useEffect(() => {
    if (handoffSignal && !withPerson && !resolved) setAskingPerson(true);
  }, [handoffSignal, withPerson, resolved]);

  useEffect(() => {
    list.current?.scrollTo?.({ top: list.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages.length, sending, askingPerson, reduced, session?.status]);

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
        <Pip pose={withPerson ? 'headset' : 'mascot'} />
        <div className="chat-title">
          <h2 className="chat-name">{withPerson && agentName ? agentName : 'Pip'}</h2>
          {withPerson && <span className="chat-chip">{session?.status === 'human' ? 'Team' : 'Connecting'} · {ticketLabel(session?.ticket)}</span>}
          {resolved && <span className="chat-chip done">Resolved · {ticketLabel(session?.ticket)}</span>}
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
            <CheckIcon /> {agentName ?? 'A person'} joined the chat
          </motion.div>
        )}
      </AnimatePresence>

      <div className="chat-list" ref={list} aria-live="polite">
        {ready && messages.length === 0 && (
          <div className="chat-empty">
            <motion.img
              src="/art/v2/pip-wave.webp"
              onError={(e) => ((e.target as HTMLImageElement).src = '/art/empty-chat.png')}
              alt=""
              width="200"
              height="200"
              animate={reduced ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <p>{chat.settings?.greeting ?? "Hi, I'm Pip! Ask me anything about Sleep Pets & Chop Trees."}</p>
            <div className="spct-chips">
              {(chat.settings?.starterQuestions ?? []).map((q) => (
                <button key={q} type="button" className="spct-chip" onClick={() => void chat.send(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {!ready && !error && <div className="chat-skeleton" aria-label="Loading chat"><span /><span /></div>}
        {messages.map((m) => (
          <Message key={m.id} m={m} chat={chat} animate={fresh.includes(m.id)} onHandoff={() => setAskingPerson(true)} />
        ))}
        {withPerson && <TicketCard chat={chat} />}
        {sending && !askingPerson && <Thinking toPerson={withPerson} />}
        {askingPerson && !withPerson && !resolved && <Handoff chat={chat} onDone={() => setAskingPerson(false)} />}
        {resolved && (
          <div className="resolved-card">
            <p className="handoff-title"><CheckIcon /> This chat is closed</p>
            <p>Ticket {ticketLabel(session?.ticket)} was resolved. Need something else? Start a fresh chat with Pip.</p>
            <RaisedPill onClick={() => void chat.startNew()}>Start new chat</RaisedPill>
          </div>
        )}
      </div>

      {error && <p className="chat-error" role="alert">{error}</p>}

      <form className="composer" onSubmit={submit}>
        <label htmlFor={`msg-${variant}`} className="spct-sr-only">Message Pip</label>
        <input
          id={`msg-${variant}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={resolved ? 'This chat is closed' : withPerson ? 'Message the team…' : 'Ask about the game…'}
          maxLength={1000}
          disabled={resolved || !ready}
          autoComplete="off"
        />
        <motion.button type="submit" className="send-btn" aria-label="Send" disabled={resolved || !text.trim() || sending} whileTap={reduced ? undefined : { scale: 0.9 }}>
          <SendIcon />
        </motion.button>
      </form>
    </section>
  );
}
