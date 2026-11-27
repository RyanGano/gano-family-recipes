import type { Recipe } from '../api/types';
import { useStored } from './storage';

/** Choice id → option id. Missing or unknown entries fall back to the first option. */
export type Picks = Record<string, string>;

const parsePicks = (raw: unknown): Picks | undefined =>
  raw && typeof raw === 'object' && !Array.isArray(raw) && Object.values(raw).every((v) => typeof v === 'string')
    ? (raw as Picks)
    : undefined;

/** The cook's choices for a recipe (which frosting, ...); remembered per recipe. */
export const usePicks = (slug: string) => useStored<Picks>(`picks.${slug}`, parsePicks, {});

/** The option in effect for each of the recipe's choices. */
export function resolvePicks(recipe: Recipe, picks: Picks): Picks {
  return Object.fromEntries(
    (recipe.choices ?? []).map((c) => [c.id, c.options.some((o) => o.id === picks[c.id]) ? picks[c.id] : c.options[0].id]),
  );
}

/** The recipe as the cook will make it: only the ingredients and steps for the picked options. */
export function applyPicks(recipe: Recipe, picks: Picks): Recipe {
  if (!recipe.choices?.length) return recipe;
  const chosen = resolvePicks(recipe, picks);
  const keep = (x: { when?: { choice: string; option: string } }) => !x.when || chosen[x.when.choice] === x.when.option;
  return { ...recipe, ingredients: recipe.ingredients.filter(keep), steps: recipe.steps.filter(keep) };
}
