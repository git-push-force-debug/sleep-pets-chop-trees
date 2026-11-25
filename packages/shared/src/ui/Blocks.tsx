import { animate, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Block } from '../blocks.ts';
import type { GuideImage } from '../guide.ts';
import { BulbIcon, InfoIcon, PersonIcon, WarnIcon } from './icons.tsx';
import { Markdown } from './Markdown.tsx';
import { RaisedPill } from './RaisedPill.tsx';

type Of<T extends Block['type']> = Extract<Block, { type: T }>;
const TABLE_PREVIEW_ROWS = 5;

export const TextBlock = ({ block }: { block: Of<'text'> }) => (
  <div className="spct-card spct-text">
    <Markdown text={block.markdown} />
  </div>
);

export const StepsBlock = ({ block, live = false }: { block: Of<'steps'>; live?: boolean }) => (
  <div className="spct-card spct-steps">
    {block.title && <h4>{block.title}</h4>}
    <ol>
      {block.items.map((item, i) => (
        <motion.li key={i} initial={live ? { opacity: 0, x: -8 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }}>
          <motion.span className="spct-node" aria-hidden="true" initial={live ? { scale: 0 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.2 + i * 0.12 }}>{i + 1}</motion.span>
          <div>
            <b>{item.title}</b>
            {item.detail && <span>{item.detail}</span>}
          </div>
        </motion.li>
      ))}
    </ol>
  </div>
);

export function TableBlock({ block, live = false }: { block: Of<'table'>; live?: boolean }) {
  const [all, setAll] = useState(block.rows.length <= TABLE_PREVIEW_ROWS);
  const rows = all ? block.rows : block.rows.slice(0, TABLE_PREVIEW_ROWS);
  return (
    <div className="spct-card spct-table">
      <div className="spct-table-scroll">
        <table>
          {block.title && <caption>{block.title}</caption>}
          <thead>
            <tr>{block.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <motion.tr key={r} initial={live ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + r * 0.06 }}>
                {block.columns.map((_, c) => <td key={c}>{row[c] ?? ''}</td>)}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {!all && (
        <button type="button" className="spct-more" onClick={() => setAll(true)}>
          Show all {block.rows.length} rows
        </button>
      )}
    </div>
  );
}

/** Counts the number inside a stat up from 0 (M8); always ends on the exact original text. */
function CountUp({ value, live }: { value: string; live: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const match = value.match(/^([^0-9]*)([0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);
  useEffect(() => {
    if (!live || !match || !ref.current) return; // new replies are on screen, so count on mount
    const target = Number(match[2]!.replace(/,/g, ''));
    const decimals = match[2]!.split('.')[1]?.length ?? 0;
    const controls = animate(0, target, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${match[1]}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${match[3]}`;
      },
      onComplete: () => {
        if (ref.current) ref.current.textContent = value;
      },
    });
    return () => controls.stop();
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  return <b ref={ref}>{value}</b>;
}

export const StatsBlock = ({ block, live = false }: { block: Of<'stats'>; live?: boolean }) => (
  <div className="spct-stats">
    {block.items.map((s, i) => (
      <div key={i} className="spct-stat">
        <span>{s.label}</span>
        <CountUp value={s.value} live={live} />
        {s.hint && <small>{s.hint}</small>}
      </div>
    ))}
  </div>
);

export const ImagesBlock = ({ block, images, onOpen }: { block: Of<'images'>; images: Map<string, GuideImage>; onOpen: (img: GuideImage) => void }) => (
  <div className={`spct-images spct-images-${Math.min(block.imageIds.length, 3)}`}>
    {block.imageIds.map((id) => {
      const img = images.get(id);
      return img ? (
        <figure key={id} className="spct-card">
          <button type="button" aria-label={`Open picture: ${img.alt}`} onClick={() => onOpen(img)}>
            <img src={img.url} alt={img.alt} loading="lazy" width={img.width} height={img.height} />
          </button>
        </figure>
      ) : null;
    })}
  </div>
);

const CALLOUT = {
  tip: { icon: <BulbIcon />, label: 'Tip' },
  info: { icon: <InfoIcon />, label: 'Good to know' },
  warning: { icon: <WarnIcon />, label: 'Heads up' },
} as const;

export const CalloutBlock = ({ block }: { block: Of<'callout'> }) => (
  <div className={`spct-callout spct-callout-${block.tone}`}>
    {CALLOUT[block.tone].icon}
    <p>
      <b>{CALLOUT[block.tone].label}</b> · <span>{block.text}</span>
    </p>
  </div>
);

export const CardBlock = ({ block, images, onOpen }: { block: Of<'card'>; images: Map<string, GuideImage>; onOpen: (img: GuideImage) => void }) => {
  const img = block.imageId ? images.get(block.imageId) : undefined;
  return (
    <div className="spct-card spct-entity">
      {img && (
        <button type="button" aria-label={`Open picture: ${img.alt}`} onClick={() => onOpen(img)}>
          <img src={img.url} alt={img.alt} loading="lazy" />
        </button>
      )}
      <div>
        <h4>{block.title}</h4>
        {block.subtitle && <p className="spct-sub">{block.subtitle}</p>}
        {block.facts.length > 0 && (
          <dl>
            {block.facts.map((f, i) => (
              <div key={i}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
};

export const HandoffBlock = ({ block, onHandoff, disabled }: { block: Of<'handoff'>; onHandoff: () => void; disabled?: boolean }) => (
  <div className="spct-card spct-handoff">
    <p className="spct-handoff-title">
      <PersonIcon /> A person can help with this
    </p>
    <p>{block.reason}</p>
    <RaisedPill variant="green" onClick={onHandoff} disabled={disabled}>
      Talk to a person
    </RaisedPill>
  </div>
);
