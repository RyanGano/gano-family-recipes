/** Rubber stamps in the top corner of a card, for anything unusual about the recipe. */
export function Stamps({ stamps }: { stamps: string[] }) {
  if (!stamps.length) return null;
  return (
    <span className="stamps">
      {stamps.map((s) => (
        <span key={s} className="stamp">
          {s}
        </span>
      ))}
    </span>
  );
}
