import { motion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import type { Block, BotReply as Reply } from '../blocks.ts';
import type { GuideImage } from '../guide.ts';
import { CalloutBlock, CardBlock, HandoffBlock, ImagesBlock, StatsBlock, StepsBlock, TableBlock, TextBlock } from './Blocks.tsx';
import { BookIcon } from './icons.tsx';
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
}

/**
 * Generative UI reply: the first text block types out (M10), then the other blocks enter in layers,
 * then sources and reply chips. Every mode ends in the same final content.
 */
export function BotReply({ reply, onSuggestion, onHandoff, animate = false, handoffDisabled, footer }: Props) {
  const reduced = usePrefersReducedMotion();
  const live = animate && !reduced;
  const [first, ...rest] = reply.blocks;
  const typed = first?.type === 'text' ? first : null;
  const [typingDone, setTypingDone] = useState(!live || !typed);
  const [lightbox, setLightbox] = useState<GuideImage | null>(null);
  const images = useMemo(() => new Map(reply.images.map((i) => [i.id, i])), [reply.images]);
  const blocks = typed ? rest : reply.blocks;

  const render = (block: Block) => {
    switch (block.type) {
      case 'text': return <TextBlock block={block} />;
      case 'steps': return <StepsBlock block={block} />;
      case 'table': return <TableBlock block={block} />;
      case 'stats': return <StatsBlock block={block} />;
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
            <motion.div className="spct-sources" {...layer(blocks.length)}>
              <span>Sources</span>
              {reply.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="spct-source">
                  <BookIcon /> {s.title}
                </a>
              ))}
            </motion.div>
          )}
          {footer}
          {reply.suggestions.length > 0 && (
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
