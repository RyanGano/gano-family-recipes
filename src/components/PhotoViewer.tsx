import { useEffect, useState } from 'react';
import type { Photo } from '../api/types';

/** A full-screen slideshow of a recipe's photos: arrows (or ← →) step through, Esc or a tap outside closes. */
export function PhotoViewer({ title, photos, onClose }: { title: string; photos: Photo[]; onClose: () => void }) {
  const [at, setAt] = useState(0);
  const many = photos.length > 1;
  const step = (by: number) => setAt((i) => (i + by + photos.length) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const photo = photos[at];
  return (
    <div className="viewer" onClick={onClose}>
      <figure className="viewer__frame" role="dialog" aria-label={`Photos of ${title}`} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn viewer__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <img className="viewer__photo" src={`${import.meta.env.BASE_URL}${photo.src}`} alt={`${title}: ${photo.caption}`} />
        <figcaption className="viewer__caption">
          {photo.caption}
          {many && <span className="viewer__count">{at + 1} of {photos.length}</span>}
        </figcaption>
        {many && (
          <>
            <button className="viewer__arrow viewer__arrow--prev" onClick={() => step(-1)} aria-label="Previous photo">
              ‹
            </button>
            <button className="viewer__arrow viewer__arrow--next" onClick={() => step(1)} aria-label="Next photo">
              ›
            </button>
          </>
        )}
      </figure>
    </div>
  );
}
