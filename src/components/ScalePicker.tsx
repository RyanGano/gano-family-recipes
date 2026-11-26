import type { Recipe } from '../api/types';
import { formatAmount } from '../lib/format';
import { SCALES } from '../lib/prefs';

/** "Makes 24 puffs" with ½× / 1× / 2× / 3× buttons that scale every amount. */
export function ScalePicker({ recipe, scale, onChange }: { recipe: Recipe; scale: number; onChange: (s: number) => void }) {
  return (
    <div className="scale">
      <span className="scale__label">
        Makes <strong>{formatAmount(recipe.yield.amount * scale)}</strong> {recipe.yield.unit}
      </span>
      <div className="scale__buttons" role="group" aria-label="Batch size">
        {SCALES.map((s) => (
          <button key={s} className={`chip ${s === scale ? 'is-active' : ''}`} onClick={() => onChange(s)} aria-pressed={s === scale}>
            {s === 0.5 ? '½' : s}×
          </button>
        ))}
      </div>
    </div>
  );
}
