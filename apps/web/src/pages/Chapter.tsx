import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation, useParams } from 'react-router';
import remarkGfm from 'remark-gfm';
import type { GuideImage } from '../../../../packages/shared/src/guide.ts';
import { useUiLabels } from '../../../../packages/shared/src/ui/labels.tsx';
import { cjkEmphasis } from '../../../../packages/shared/src/ui/Markdown.tsx';
import { Lightbox } from '../../../../packages/shared/src/ui/Lightbox.tsx';
import { chapterBySlug, piecesOf, useGuide } from '../guide.ts';
import { useLang } from '../i18n.tsx';
import { openChat } from '../site.ts';
import { NotFound } from './NotFound.tsx';

export function Chapter() {
  const slug = useParams().chapter;
  const g = useGuide();
  const { t } = useLang();
  const ui = useUiLabels();
  const [lightbox, setLightbox] = useState<GuideImage | null>(null);
  const { hash } = useLocation();
  // The Chinese guide loads after Layout's scroll-to-hash ran, so scroll again once it's here.
  useEffect(() => {
    if (g && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [g, hash]);

  if (!g) return <p className="wrap page-pad">{t.loadingGuide}</p>;
  const chapter = chapterBySlug(g, slug);
  if (!chapter) return <NotFound />;
  const sections = chapter.sections;

  return (
    <div className="wrap page-pad chapter-layout">
      <aside className="chapter-aside">
        <p className="label">{t.inChapter}</p>
        <nav aria-label={t.sectionsLabel} className="toc">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.title}</a>
          ))}
        </nav>
      </aside>
      <article className="chapter-body">
        <p className="eyebrow">{chapter.number} / {t.guideEyebrow}</p>
        <h1>{chapter.title}</h1>
        <p className="lede">{chapter.summary}</p>
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="guide-section" aria-labelledby={`${section.id}-h`}>
            <h2 id={`${section.id}-h`}>{section.title}</h2>
            {piecesOf(g, section.markdown).map((piece, i) =>
              piece.kind === 'md' ? (
                <div key={i} className="prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                    {cjkEmphasis(piece.text)}
                  </ReactMarkdown>
                </div>
              ) : (
                <figure key={i} className="guide-figure">
                  <button type="button" aria-label={`${ui.openPicture}${piece.image.alt}`} onClick={() => setLightbox(piece.image)}>
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
          <span>{t.stillUnsure}</span>
          <button type="button" className="spct-pill spct-pill-secondary" onClick={() => openChat()}>{t.askPip}</button>
        </div>
      </article>
      <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
