/**
 * Recipe data model.
 *
 * Recipes are written once as data and drive three views:
 *  - the recipe card (classic ingredients + directions),
 *  - cook mode (one full-screen step at a time),
 *  - the recipe box (search / categories).
 *
 * Amounts are stored as numbers so they can be scaled; the UI formats them
 * back into kitchen fractions (½, ⅓, ¾ ...).
 */

export interface Recipe {
  /** URL-safe id, e.g. "breakfast-puffs". Must be unique. */
  slug: string;
  title: string;
  /** Who the recipe came from, e.g. "Grandma Gano". */
  from?: string;
  /** One or two sentences of family history shown on the card. */
  story?: string;
  category: Category;
  tags?: string[];
  /** What one batch makes. `amount` is what the scaler multiplies. */
  yield: { amount: number; unit: string };
  /** Minutes. Optional, shown as badges. */
  prepMinutes?: number;
  cookMinutes?: number;
  /** Ordered list of sections, e.g. ["Puffs", "Sugar Coating"]. */
  sections: string[];
  ingredients: Ingredient[];
  /** Equipment worth gathering up front ("24-cup muffin tin"). */
  equipment?: string[];
  steps: Step[];
  /** Extra notes shown at the bottom of the card and on the finish screen. */
  notes?: string[];
  /** Optional photo, path relative to /public (e.g. "photos/puffs.jpg"). */
  photo?: string;
}

export type Category =
  | 'Breakfast'
  | 'Breads'
  | 'Mains'
  | 'Sides'
  | 'Soups'
  | 'Salads'
  | 'Desserts'
  | 'Cookies'
  | 'Drinks'
  | 'Snacks'
  | 'Holiday';

export interface Ingredient {
  /** Unique within the recipe; steps reference ingredients by this id. */
  id: string;
  /** Section name from `Recipe.sections`. */
  section: string;
  /** Omit for "to taste" style ingredients. */
  quantity?: number;
  /** Units listed in `src/lib/format.ts` get automatic plurals. */
  unit?: string;
  name: string;
  /** Name to use when the scaled amount is exactly 1 ("egg" vs "eggs"). */
  singular?: string;
  /** Trailing preparation note, e.g. "melted". */
  note?: string;
}

/** A reference from a step to an ingredient, optionally only part of it. */
export interface IngredientUse {
  ref: string;
  /** Fraction of the ingredient used in this step (e.g. 1/3 of the milk). */
  fraction?: number;
  /** Replaces the ingredient name, e.g. "milk (last of 3)". */
  label?: string;
}

export interface Timer {
  label: string;
  /** Shortest time. For a range like "20–25 minutes" this is 20 min. */
  seconds: number;
  /** Longest time for a range. When set, a "check now" chime fires at `seconds`. */
  maxSeconds?: number;
  /** What to look for when the timer goes off, e.g. "golden brown". */
  doneWhen?: string;
}

export interface Step {
  id: string;
  /** Section name from `Recipe.sections`. */
  section: string;
  /** Short title shown big in cook mode, e.g. "Mix the wet ingredients". */
  title: string;
  /** Full instruction sentence(s). */
  text: string;
  /** Ingredients needed for this step, shown with amounts. */
  uses?: IngredientUse[];
  /**
   * Ordered sub-actions to tick off, e.g. alternating additions.
   * Each item may reference an ingredient so its amount is shown and scaled.
   */
  checklist?: { text?: string; use?: IngredientUse }[];
  timers?: Timer[];
  /** Oven / stove temperature callout. */
  temperature?: { degrees: number; unit: 'F' | 'C'; label?: string };
  /** Helpful hint shown under the step. */
  tip?: string;
  /** Do this step while an earlier timer runs (shown as a badge). */
  whileWaiting?: boolean;
}
