import type { Ingredient } from '../api/types';
import { SCALES, scaleKey } from '../lib/prefs';
import { href } from '../lib/route';
import { writeStored } from '../lib/storage';

/** The scale to open a linked recipe at: the scaled number of batches, when the scaler offers it. */
export function linkedScale(ingredient: Ingredient, scale: number): number | undefined {
  if (ingredient.unit !== 'batch' || ingredient.quantity === undefined) return undefined;
  const batches = ingredient.quantity * scale;
  return (SCALES as readonly number[]).includes(batches) ? batches : undefined;
}

/** "📖 See the recipe" under an ingredient made from another recipe in the box. */
export function RecipeLink({ ingredient, scale }: { ingredient: Ingredient; scale: number }) {
  const slug = ingredient.recipe;
  if (!slug) return null;
  return (
    <a
      className="recipe-link"
      href={href({ kind: 'recipe', slug })}
      onClick={() => {
        const batches = linkedScale(ingredient, scale);
        if (batches !== undefined) writeStored(scaleKey(slug), batches);
      }}
    >
      <span aria-hidden>📖</span> See the recipe
    </a>
  );
}
