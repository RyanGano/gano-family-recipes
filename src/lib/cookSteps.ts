import type { Ingredient, Recipe, Step } from '../api/types';
import { findIngredient } from './format';

/** One cook-mode step screen: a recipe step, or a step of a recipe folded in from a linked ingredient. */
export interface CookStep {
  step: Step;
  /** The recipe this step belongs to. Its ingredient refs resolve here. */
  owner: Recipe;
  /** Multiplies the cook's chosen scale: the number of batches of a folded-in recipe, else 1. */
  factor: number;
  /** Shown step number: "20", or "20c" for the third folded-in step after step 20. */
  num: string;
  /** Unique across the whole screen list; used for check-offs and React keys. */
  key: string;
  /** Set on folded-in steps: which linked recipe and where in it. */
  part?: { ingredient: Ingredient; recipe: Recipe; n: number; of: number };
}

/**
 * The cook-mode step list. A step with `makesRecipe` is followed by every step of
 * the recipe its ingredient links to, numbered 20a, 20b, ..., so the cook never
 * leaves the recipe they are making. `recipes` is the whole box; a link to a
 * recipe that isn't in it folds in nothing.
 */
export function cookSteps(recipe: Recipe, recipes: Recipe[]): CookStep[] {
  return recipe.steps.flatMap((step, i): CookStep[] => {
    const num = String(i + 1);
    const own: CookStep = { step, owner: recipe, factor: 1, num, key: step.id };
    if (!step.makesRecipe) return [own];
    const ingredient = findIngredient(recipe, step.makesRecipe);
    const linked = recipes.find((r) => r.slug === ingredient.recipe);
    if (!linked) return [own];
    const factor = ingredient.unit === 'batch' ? (ingredient.quantity ?? 1) : 1;
    return [
      own,
      ...linked.steps.map((s, j) => ({
        step: s,
        owner: linked,
        factor,
        num: `${num}${String.fromCharCode(97 + j)}`,
        key: `${ingredient.id}/${s.id}`,
        part: { ingredient, recipe: linked, n: j + 1, of: linked.steps.length },
      })),
    ];
  });
}

/** The screen index (1-based, as in the cook route) of a recipe's own step. */
export function screenOf(screens: CookStep[], step: Step): number {
  return screens.findIndex((s) => s.step === step) + 1;
}
