import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../../packages/shared/src/ui/motion.ts';

const DECEL = [0.22, 1, 0.36, 1] as const;

/** Toast (motion family M4): one at a time, rises in, swaps in place, dwells 2.5s, one polite announcement. */
type Toast = { id: number; text: string; tone: 'ok' | 'error' };
const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const reduced = usePrefersReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), text, tone });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 5000 : 2500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              key={toast.id}
              className={`toast ${toast.tone}`}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: DECEL } }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.16 } }}
            >
              {toast.tone === 'ok' ? '✓ ' : ''}{toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/** Count-up (M8): numbers ease to their new value over 700ms; a leading number keeps its suffix ("42%", "12 min"). */
export function CountUp({ value }: { value: string }) {
  const reduced = usePrefersReducedMotion();
  const match = /^(\d+(?:\.\d+)?)(.*)$/.exec(value);
  const target = match ? Number(match[1]) : null;
  const [shown, setShown] = useState(target ?? 0);
  const from = useRef(0);
  useEffect(() => {
    if (target === null || reduced) return void setShown(target ?? 0);
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const v = begin + (target - begin) * (1 - (1 - t) ** 3);
      setShown(v);
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = target;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      from.current = target; // a new value restarts from where this one was heading
    };
  }, [target, reduced]);
  if (!match) return <>{value}</>;
  const decimals = match[1]!.includes('.') ? 1 : 0;
  return <>{shown.toFixed(decimals)}{match[2]}</>;
}

/** Page change (M3, desktop-sized): the new page slides in from the right as a card. */
export function PageIn({ id, children }: { id: string; children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      key={id}
      className="page-in"
      initial={reduced ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: DECEL }}
    >
      {children}
    </motion.div>
  );
}
