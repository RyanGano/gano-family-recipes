import { glossary, type GlossaryTerm } from '../api/glossary';

export type GlossaryPiece = string | { text: string; term: GlossaryTerm };

const byForm = new Map<string, GlossaryTerm>();
for (const t of glossary) for (const f of t.forms) byForm.set(f.toLowerCase(), t);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest forms first, so "punch the dough down" wins over shorter matches.
const pattern = new RegExp(
  `\\b(${[...byForm.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})\\b`,
  'gi',
);

/** Splits text into plain strings and glossary terms, in order. */
export function splitGlossary(text: string): GlossaryPiece[] {
  const pieces: GlossaryPiece[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) pieces.push(text.slice(last, m.index));
    pieces.push({ text: m[0], term: byForm.get(m[0].toLowerCase())! });
    last = m.index + m[0].length;
  }
  if (last < text.length) pieces.push(text.slice(last));
  return pieces;
}
