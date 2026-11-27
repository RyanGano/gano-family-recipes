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
  /** What one batch makes. `amount` is what the scaler multiplies; units listed in `src/lib/format.ts` ("cup") get automatic plurals. */
  yield: { amount: number; unit: string };
  /** Minutes. Optional, shown as badges. */
  prepMinutes?: number;
  cookMinutes?: number;
  /**
   * Hands-off time on top of prep and cook, such as rising or chilling. Shown as
   * "60 min + 2½ hrs of rising" in the recipe box and as its own badge on the card.
   */
  waitTime?: { minutes: number; label: string };
  /**
   * Rubber stamps on the recipe box card for anything unusual about the recipe
   * ("Needs a candy thermometer"). A recipe with `nightBefore` steps gets
   * "Start the night before" automatically, so don't repeat it here.
   */
  stamps?: string[];
  /** Ordered list of sections, e.g. ["Puffs", "Sugar Coating"]. */
  sections: string[];
  ingredients: Ingredient[];
  /** Equipment worth gathering up front ("24-cup muffin tin"). */
  equipment?: string[];
  steps: Step[];
  /** Extra notes shown at the bottom of the card and on the finish screen. */
  notes?: string[];
  /** Photos shown on the recipe card, in order: the finished dish, the original card, ... */
  photos?: Photo[];
}

export interface Photo {
  /** Path relative to /public, e.g. "photos/orange-twists.jpg". */
  src: string;
  /** Shown under the photo and used as its alt text, e.g. "The original card". */
  caption: string;
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
  /** Top of a range, e.g. 7.5 with `quantity: 6` shows "6–7½ cups". */
  maxQuantity?: number;
  /** Units listed in `src/lib/format.ts` get automatic plurals. */
  unit?: string;
  name: string;
  /** Name to use when the scaled amount is exactly 1 ("egg" vs "eggs"). */
  singular?: string;
  /** Trailing preparation note, e.g. "melted". */
  note?: string;
  /**
   * Puts this ingredient on the "What you might need to buy" list: something a
   * cook is unlikely to have on hand. `true` lists the ingredient itself (scaled).
   * A string names what to buy instead, e.g. "Fresh oranges (for the grated rind)".
   * Ingredients with the same string are listed once.
   */
  buy?: true | string;
  /**
   * Slug of another recipe in the box that makes this ingredient, e.g.
   * "cream-cheese-frosting". Give the amount in batches (`quantity: 1, unit: 'batch'`).
   * The recipe card and cook-mode steps that use it show an "Open the recipe" link,
   * and opening it sets the linked recipe's scaler to the scaled number of batches.
   */
  recipe?: string;
}

/** A reference from a step to an ingredient, optionally only part of it. */
export interface IngredientUse {
  ref: string;
  /** Fraction of the ingredient used in this step (e.g. 1/3 of the milk). */
  fraction?: number;
  /**
   * The part used in this step as an amount, in the ingredient's unit, in place of
   * `fraction`: 2 cups of the 6–7½ cups of flour, then `quantity: 4, maxQuantity: 5.5`
   * for the rest. Scaled like everything else.
   */
  quantity?: number;
  maxQuantity?: number;
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
  /**
   * Do this step the day or night before. Shown as a badge in cook mode, and the
   * recipe card and gather screen warn up front. "recommended" means the recipe
   * still works without it ("they turn out better").
   */
  nightBefore?: 'required' | 'recommended';
  /**
   * Id of an ingredient that links to another recipe (`Ingredient.recipe`). Cook mode
   * plays that recipe's steps right after this one, numbered 20a, 20b, ..., scaled to
   * the number of batches, so the cook never leaves this recipe.
   */
  makesRecipe?: string;
}
