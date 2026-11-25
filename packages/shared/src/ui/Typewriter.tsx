import { useEffect, useMemo, useState } from 'react';
import { Markdown, markdownToPlain } from './Markdown.tsx';

const CHARS_PER_SECOND = 55; // M10 proposed pace

const graphemes = (text: string): string[] =>
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment)
    : [...text];

/**
 * M10 typewriter. Reveals grapheme clusters (never splits emoji), exposes the full text to screen readers
 * from the start, skips to the end on click or key press, then renders the real markdown.
 */
export function Typewriter({ markdown, animate, onDone }: { markdown: string; animate: boolean; onDone?: () => void }) {
  const plain = useMemo(() => markdownToPlain(markdown), [markdown]);
  const clusters = useMemo(() => graphemes(plain), [plain]);
  const [shown, setShown] = useState(animate ? 0 : clusters.length);
  const done = shown >= clusters.length;

  useEffect(() => {
    if (done) {
      onDone?.();
      return;
    }
    const started = performance.now() - (shown / CHARS_PER_SECOND) * 1000;
    let frame = requestAnimationFrame(function tick(now) {
      const next = Math.min(clusters.length, Math.floor(((now - started) / 1000) * CHARS_PER_SECOND));
      setShown(next);
      if (next < clusters.length) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per reveal; `shown` only seeds the start time
  }, [done, clusters]);

  if (done) {
    return (
      <div className="spct-text">
        <Markdown text={markdown} />
      </div>
    );
  }
  const skip = () => setShown(clusters.length);
  return (
    <div className="spct-text spct-typing" onClick={skip} onKeyDown={skip} role="presentation">
      <span className="spct-sr-only">{plain}</span>
      <p aria-hidden="true">
        {clusters.slice(0, shown).join('')}
        <span className="spct-caret" />
      </p>
    </div>
  );
}
