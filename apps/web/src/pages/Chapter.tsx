import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router';
import remarkGfm from 'remark-gfm';
import type { GuideImage } from '../../../../packages/shared/src/guide.ts';
import { Lightbox } from '../../../../packages/shared/src/ui/Lightbox.tsx';
import { chapterBySlug, piecesOf } from '../guide.ts';
import { openChat } from '../site.ts';
import { NotFound } from './NotFound.tsx';

export function Chapter() {
  const chapter = chapterBySlug(useParams().chapter);
  const [lightbox, setLightbox] = useState<GuideImage | null>(null);

  if (!chapter) return <NotFound />;
  const sections = chapter.sections;

  return (
    <div className="wrap page-pad chapter-layout">
      <aside className="chapter-aside">
        <p className="label">In this chapter</p>
        <nav aria-label="Sections" className="toc">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.title}</a>
          ))}
        </nav>
      </aside>
      <article className="chapter-body">
        <p className="eyebrow">{chapter.number} / Guide</p>
        <h1>{chapter.title}</h1>
        <p className="lede">{chapter.summary}</p>
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="guide-section" aria-labelledby={`${section.id}-h`}>
            <h2 id={`${section.id}-h`}>{section.title}</h2>
            {piecesOf(section.markdown).map((piece, i) =>
              piece.kind === 'md' ? (
                <div key={i} className="prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                    {piece.text}
                  </ReactMarkdown>
                </div>
              ) : (
                <figure key={i} className="guide-figure">
                  <button type="button" aria-label={`Open picture: ${piece.image.alt}`} onClick={() => setLightbox(piece.image)}>
                    <img src={piece.image.url} alt={piece.image.alt} width={piece.image.width} height={piece.image.height} loading="lazy" />
                  </button>
                  <figcaption>
                    {piece.image.label && <b>{piece.image.label}</b>} {piece.image.caption}
                  </figcaption>
                </figure>
              ),
            )}
          </section>
        ))}
        <div className="ask-strip">
          <span>Still unsure? Ask Pip — it reads this guide.</span>
          <button type="button" className="spct-pill spct-pill-secondary" onClick={() => openChat()}>Ask Pip</button>
        </div>
      </article>
      <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
