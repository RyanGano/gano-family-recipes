import { useState } from 'react';
import { splitGlossary } from '../lib/glossary';

/** Text with glossary terms made tappable; tapping one shows its definition below the text. */
export function GlossaryText({ text }: { text: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const pieces = splitGlossary(text);
  const shown = pieces.find((p) => typeof p !== 'string' && p.term.term === open);
  return (
    <>
      {pieces.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <button
            key={i}
            type="button"
            className={`term ${open === p.term.term ? 'is-open' : ''}`}
            aria-expanded={open === p.term.term}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(open === p.term.term ? null : p.term.term);
            }}
          >
            {p.text}
          </button>
        ),
      )}
      {shown && typeof shown !== 'string' && (
        <span className="term-def" role="note">
          <strong>{shown.term.term}:</strong> {shown.term.definition}
          <button type="button" className="term-def__close" aria-label="Close definition" onClick={() => setOpen(null)}>
            ✕
          </button>
        </span>
      )}
    </>
  );
}
