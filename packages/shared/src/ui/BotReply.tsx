import { motion } from 'motion/react';
import { useUiLabels } from './labels.tsx';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Block, BotReply as Reply } from '../blocks.ts';
import type { GuideImage } from '../guide.ts';
import { CalloutBlock, CardBlock, HandoffBlock, ImagesBlock, ResolveAsk, StatsBlock, StepsBlock, TableBlock, TextBlock } from './Blocks.tsx';
import { Lightbox } from './Lightbox.tsx';
import { usePrefersReducedMotion } from './motion.ts';
import { Typewriter } from './Typewriter.tsx';

const STAGGER = 0.08; // seconds between layered block entrances
const ENTER = { opacity: 0, y: 10, scale: 0.98 };
const SHOWN = { opacity: 1, y: 0, scale: 1 };
const SPRING = { type: 'spring', stiffness: 420, damping: 32 } as const;

interface Props {
  reply: Reply;
  onSuggestion: (text: string) => void;
  onHandoff: () => void;
  /** Play the typewriter and layered entrance (new replies only). Reduced motion always shows everything at once. */
  animate?: boolean;
  handoffDisabled?: boolean;
  footer?: ReactNode;
  /** Called once the entrance has finished (immediately when nothing animates). */
  onDone?: () => void;
  /** Reply chips only on the latest answer, before the player has replied (default true). */
  showSuggestions?: boolean;
  /** Answer to a "solved?" question (reply.ask === 'resolve'); buttons show only when `askActive`. */
  onResolve?: (solved: boolean) => void;
  askActive?: boolean;
}

/**
 * Generative UI reply: the first text block types out (M10), then the other blocks enter in layers,
 * then sources and reply chips. Every mode ends in the same final content.
 */
export function BotReply({ reply, onSuggestion, onHandoff, animate = false, handoffDisabled, footer, onDone, showSuggestions = true, onResolve, askActive = false }: Props) {
  const reduced = usePrefersReducedMotion();
  const ui = useUiLabels();
  const live = animate && !reduced;
  const [first, ...rest] = reply.blocks;
  const typed = first?.type === 'text' ? first : null;
  const [typingDone, setTypingDone] = useState(!live || !typed);
  const [lightbox, setLightbox] = useState<GuideImage | null>(null);
  const images = useMemo(() => new Map(reply.images.map((i) => [i.id, i])), [reply.images]);
  const blocks = typed ? rest : reply.blocks;

  useEffect(() => {
    if (!typingDone || !onDone) return;
    const settle = live ? (blocks.length + reply.suggestions.length + 2) * STAGGER * 1000 + 450 : 0;
    const t = setTimeout(onDone, settle);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when the entrance completes
  }, [typingDone]);

  const render = (block: Block) => {
    switch (block.type) {
      case 'text': return <TextBlock block={block} />;
      case 'steps': return <StepsBlock block={block} live={live} />;
      case 'table': return <TableBlock block={block} live={live} />;
      case 'stats': return <StatsBlock block={block} live={live} />;
      case 'images': return <ImagesBlock block={block} images={images} onOpen={setLightbox} />;
      case 'callout': return <CalloutBlock block={block} />;
      case 'card': return <CardBlock block={block} images={images} onOpen={setLightbox} />;
      case 'handoff': return <HandoffBlock block={block} onHandoff={onHandoff} disabled={handoffDisabled} />;
    }
  };

  const layer = (i: number) =>
    live ? { initial: ENTER, animate: SHOWN, transition: { ...SPRING, delay: i * STAGGER } } : { initial: false as const };

  return (
    <div className="spct-reply">
      {typed && (
        <div className="spct-card">
          <Typewriter markdown={typed.markdown} animate={live} onDone={() => setTypingDone(true)} />
        </div>
      )}
      {typingDone && (
        <>
          {blocks.map((block, i) => (
            <motion.div key={i} {...layer(i)}>
              {render(block)}
            </motion.div>
          ))}
          {reply.sources.length > 0 && (
            <motion.p className="spct-sources" {...layer(blocks.length)}>
              {reply.sources.length > 1 ? ui.sources : ui.source}
              {reply.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && ', '}
                  <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a>
                </span>
              ))}
            </motion.p>
          )}
          {reply.ask === 'resolve' && onResolve && <ResolveAsk active={askActive} onAnswer={onResolve} />}
          {footer}
          {showSuggestions && reply.suggestions.length > 0 && (
            <div className="spct-chips">
              {reply.suggestions.map((text, i) => (
                <motion.button key={text} type="button" className="spct-chip" onClick={() => onSuggestion(text)} {...layer(blocks.length + 1 + i)}>
                  {text}
                </motion.button>
              ))}
            </div>
          )}
        </>
      )}
      <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
