import type { ScaledLine } from '../lib/format';

/** "1½ cups  sugar, melted" with the amount emphasised. */
export function Amount({ line }: { line: ScaledLine }) {
  return (
    <>
      {line.amount && <strong className="amt">{line.amount}</strong>} <span className="ing-name">{line.name}</span>
      {line.note && <span className="ing-note">, {line.note}</span>}
    </>
  );
}
