import { AnimatePresence, motion, useMotionValue } from 'motion/react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChatIcon } from '../../../../packages/shared/src/ui/icons.tsx';
import { usePrefersReducedMotion } from '../../../../packages/shared/src/ui/motion.ts';
import { ChatPanel } from './ChatPanel.tsx';
import { useChat, type Chat } from './useChat.ts';

const ChatContext = createContext<Chat | null>(null);
export const useChatContext = () => useContext(ChatContext)!;

const DESKTOP = '(min-width: 1024px)';
const SPRING = { type: 'spring', stiffness: 380, damping: 36 } as const;
const POS_KEY = 'spct-chat-pos';
type Dock = { side: 'left' | 'right'; bottom: number };

// Desktop: Pip can be dragged anywhere, then snaps to the nearer side; remembered per browser.
function loadDock(): Dock {
  try {
    const saved = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as Dock | null;
    if (saved && (saved.side === 'left' || saved.side === 'right') && Number.isFinite(saved.bottom)) return saved;
  } catch {
    // storage blocked or corrupt: use the default spot
  }
  return { side: 'right', bottom: 24 };
}

/** One chat for the whole site: the floating launcher and the Support page share it. */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [handoffSignal, setHandoffSignal] = useState(0);
  const chat = useChat(open || pending !== null || handoffSignal > 0);
  const launcher = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const [desktop, setDesktop] = useState(() => window.matchMedia?.(DESKTOP).matches ?? true);
  const [dock, setDock] = useState(loadDock);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dragged = useRef(false);

  const onDragEnd = () => {
    const rect = launcher.current!.getBoundingClientRect();
    const next: Dock = {
      side: rect.left + rect.width / 2 < window.innerWidth / 2 ? 'left' : 'right',
      bottom: Math.round(Math.min(Math.max(window.innerHeight - rect.bottom, 16), window.innerHeight - rect.height - 96)),
    };
    dragX.set(0);
    dragY.set(0);
    setDock(next);
    setTimeout(() => (dragged.current = false)); // after the click that may follow this pointer-up
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(next));
    } catch {
      // not saved: it still snaps for this visit
    }
  };

  useEffect(() => {
    const mq = window.matchMedia?.(DESKTOP);
    const onChange = () => setDesktop(mq.matches);
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ question?: string; handoff?: boolean }>).detail ?? {};
      setOpen(true);
      if (detail.question) setPending(detail.question);
      if (detail.handoff) setHandoffSignal((n) => n + 1);
    };
    window.addEventListener('spct:open-chat', onOpen);
    return () => window.removeEventListener('spct:open-chat', onOpen);
  }, []);

  // Send a question chosen elsewhere on the site once the chat is ready.
  useEffect(() => {
    if (pending && chat.state.ready && chat.state.session && !chat.state.sending) {
      void chat.send(pending);
      setPending(null);
    }
  }, [pending, chat]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    if (!desktop) document.body.style.overflow = 'hidden'; // phone sheet is modal
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#msg-sheet')?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, desktop]);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus());
  };

  const motionProps = reduced
    ? { initial: false as const, animate: {}, exit: {} }
    : desktop
      ? { initial: { opacity: 0, x: dock.side === 'left' ? -40 : 40, scale: 0.98 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: dock.side === 'left' ? -40 : 40 }, transition: SPRING }
      : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: SPRING };

  return (
    <ChatContext.Provider value={chat}>
      {children}
      {(
        <>
          <AnimatePresence>
            {open && !desktop && (
              <motion.div key="scrim" className="chat-scrim" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            )}
            {open && (
              <motion.div key="panel" className={`chat-dock ${desktop ? `side ${dock.side}` : 'sheet'}`} role="dialog" aria-modal={!desktop} aria-label="Chat with Pip" {...motionProps}>
                {!desktop && <span className="sheet-handle" aria-hidden="true" />}
                <ChatPanel chat={chat} onClose={close} handoffSignal={handoffSignal} />
              </motion.div>
            )}
          </AnimatePresence>
          {!open && (
            <motion.button
              ref={launcher}
              type="button"
              className={`chat-launcher ${desktop ? dock.side : ''}`}
              style={desktop ? { x: dragX, y: dragY, bottom: dock.bottom } : undefined}
              drag={desktop}
              dragMomentum={false}
              whileDrag={{ scale: 1.06, cursor: 'grabbing' }}
              onDragStart={() => (dragged.current = true)}
              onDragEnd={onDragEnd}
              onClick={() => !dragged.current && setOpen(true)}
              aria-label="Ask Pip — open chat"
              title={desktop ? 'Drag to move Pip to either side' : undefined}
            >
              <span className="launcher-bubble" aria-hidden="true">
                <b>Hi! I'm Pip</b>
                <span>Ask me anything <span className="typing"><i /><i /><i /></span></span>
              </span>
              <span className="launcher-orb" aria-hidden="true">
                <span className="pip-avatar pose launcher-avatar"><img src="/art/v3/pip-head.webp" alt="" draggable={false} onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')} /></span>
                <span className="launcher-badge"><ChatIcon size={14} /></span>
              </span>
            </motion.button>
          )}
        </>
      )}
    </ChatContext.Provider>
  );
}
