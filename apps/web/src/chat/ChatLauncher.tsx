import { AnimatePresence, motion } from 'motion/react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../../../packages/shared/src/ui/motion.ts';
import { ChatPanel } from './ChatPanel.tsx';
import { useChat, type Chat } from './useChat.ts';

const ChatContext = createContext<Chat | null>(null);
export const useChatContext = () => useContext(ChatContext)!;

const DESKTOP = '(min-width: 1024px)';
const SPRING = { type: 'spring', stiffness: 380, damping: 36 } as const;

/** One chat for the whole site: the floating launcher and the Support page share it. */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [handoffSignal, setHandoffSignal] = useState(0);
  const chat = useChat(open || pending !== null || handoffSignal > 0);
  const launcher = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const [desktop, setDesktop] = useState(() => window.matchMedia?.(DESKTOP).matches ?? true);

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
      ? { initial: { opacity: 0, x: 40, scale: 0.98 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: 40 }, transition: SPRING }
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
              <motion.div key="panel" className={`chat-dock ${desktop ? 'side' : 'sheet'}`} role="dialog" aria-modal={!desktop} aria-label="Chat with Pip" {...motionProps}>
                {!desktop && <span className="sheet-handle" aria-hidden="true" />}
                <ChatPanel chat={chat} onClose={close} handoffSignal={handoffSignal} />
              </motion.div>
            )}
          </AnimatePresence>
          {!open && (
            <button ref={launcher} type="button" className="chat-launcher" onClick={() => setOpen(true)} aria-label="Ask Pip — open chat">
              <span className="pip-avatar launcher-avatar" aria-hidden="true"><img src="/art/mascot.png" alt="" /></span>
              <span className="launcher-label">Ask Pip</span>
            </button>
          )}
        </>
      )}
    </ChatContext.Provider>
  );
}
