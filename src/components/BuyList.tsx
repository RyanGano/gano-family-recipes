import { useState } from 'react';
import type { Recipe } from '../api/types';
import { buyList } from '../lib/format';
import { useScale } from '../lib/prefs';

/**
 * "What you might need to buy": a link that opens a bottom sheet listing the
 * ingredients marked `buy`. Renders nothing when the recipe has none.
 */
export function BuyLink({ recipe, className = '' }: { recipe: Recipe; className?: string }) {
  const [open, setOpen] = useState(false);
  const [scale] = useScale(recipe.slug);
  const [copied, setCopied] = useState(false);
  const items = buyList(recipe, scale);
  if (!items.length) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${recipe.title}\n${items.map((i) => `- ${i}`).join('\n')}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the list is still on screen to read.
    }
  };

  return (
    <>
      <button className={`buy-link ${className}`} onClick={() => setOpen(true)}>
        <span aria-hidden>🛒</span> What you might need to buy
      </button>
      {open && (
        <div className="sheet" onClick={() => setOpen(false)}>
          <div className="sheet__panel" role="dialog" aria-label={`What you might need to buy for ${recipe.title}`} onClick={(e) => e.stopPropagation()}>
            <div className="sheet__head">
              <h2 className="hand-title">Not always on hand</h2>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <ul className="buy-list">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <div className="sheet__foot">
              <button className="btn btn--ghost" onClick={copy}>
                {copied ? 'Copied' : 'Copy list'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
