import { useState } from 'react';
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

export const StepsBlock = ({ block }: { block: Of<'steps'> }) => (
  <div className="spct-card spct-steps">
    {block.title && <h4>{block.title}</h4>}
    <ol>
      {block.items.map((item, i) => (
        <li key={i}>
          <span className="spct-node" aria-hidden="true">{i + 1}</span>
          <div>
            <b>{item.title}</b>
            {item.detail && <span>{item.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  </div>
);

export function TableBlock({ block }: { block: Of<'table'> }) {
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
              <tr key={r}>{block.columns.map((_, c) => <td key={c}>{row[c] ?? ''}</td>)}</tr>
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

export const StatsBlock = ({ block }: { block: Of<'stats'> }) => (
  <div className="spct-stats">
    {block.items.map((s, i) => (
      <div key={i} className="spct-stat">
        <span>{s.label}</span>
        <b>{s.value}</b>
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
          <figcaption>{[img.label, img.caption].filter(Boolean).join(' · ')}</figcaption>
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
