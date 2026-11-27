import { handPlaced } from '../lib/handPlaced';

/** Rubber stamps in the top corner of a card, for anything unusual about the recipe. */
export function Stamps({ stamps, seed }: { stamps: string[]; seed: string }) {
  if (!stamps.length) return null;
  return (
    <span className="stamps">
      {stamps.map((s) => (
        <span key={s} className="stamp" style={handPlaced(`${seed}:${s}`, { tilt: [1, 5], shift: 5 })}>
          {s}
        </span>
      ))}
    </span>
  );
}
