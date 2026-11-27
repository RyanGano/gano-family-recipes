import type { Recipe } from '../api/types';
import { resolvePicks, type Picks } from '../lib/choices';

/** "Frosting: Cream cheese | Chocolate" — one row of option chips per recipe choice. */
export function ChoicePicker({ recipe, picks, onChange }: { recipe: Recipe; picks: Picks; onChange: (p: Picks) => void }) {
  if (!recipe.choices?.length) return null;
  const chosen = resolvePicks(recipe, picks);
  return (
    <>
      {recipe.choices.map((choice) => (
        <div key={choice.id} className="choice">
          <span className="choice__label">{choice.label}</span>
          <div className="choice__options" role="radiogroup" aria-label={choice.label}>
            {choice.options.map((o) => {
              const on = chosen[choice.id] === o.id;
              return (
                <button
                  key={o.id}
                  role="radio"
                  aria-checked={on}
                  className={`choice__option ${on ? 'is-active' : ''}`}
                  onClick={() => onChange({ ...picks, [choice.id]: o.id })}
                >
                  {o.emoji && <span aria-hidden>{o.emoji}</span>} {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
