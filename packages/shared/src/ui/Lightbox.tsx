import { useEffect, useRef } from 'react';
import type { GuideImage } from '../guide.ts';
import { CloseIcon } from './icons.tsx';

/** Full-size picture in a native modal dialog: focus trap, Escape and focus restore come from the platform (M1 modal). */
export function Lightbox({ image, onClose }: { image: GuideImage | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (image && !dialog.open) dialog.showModal?.();
    if (!image && dialog.open) dialog.close();
  }, [image]);

  return (
    <dialog ref={ref} className="spct-lightbox" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={image?.alt}>
      {image && (
        <figure>
          <img src={image.url} alt={image.alt} width={image.width} height={image.height} />
          <figcaption>
            {image.label && <strong>{image.label}</strong>} {image.caption}
          </figcaption>
          <button type="button" className="spct-icon-btn spct-lightbox-close" aria-label="Close picture" onClick={onClose}>
            <CloseIcon />
          </button>
        </figure>
      )}
    </dialog>
  );
}
