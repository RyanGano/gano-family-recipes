import type { Ingredient, IngredientUse, Recipe } from '../api/types';

const FRACTIONS: [number, string][] = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
  [1, ''],
];

/** 1.5 → "1½", 0.333 → "⅓", 2.97 → "3". Rounds to the nearest kitchen fraction. */
export function formatAmount(value: number): string {
  if (value <= 0) return '0';
  let whole = Math.floor(value);
  const rest = value - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) {
    if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  }
  if (best[0] === 1) {
    whole += 1;
    best = FRACTIONS[0];
  }
  if (whole === 0 && best[1] === '') return formatAmount(1 / 8);
  return `${whole === 0 ? '' : whole}${best[1]}`;
}

const UNIT_PLURALS: Record<string, string> = {
  cup: 'cups',
  teaspoon: 'teaspoons',
  tablespoon: 'tablespoons',
  ounce: 'ounces',
  pound: 'pounds',
  pinch: 'pinches',
  dash: 'dashes',
  clove: 'cloves',
  can: 'cans',
  package: 'packages',
  stick: 'sticks',
  quart: 'quarts',
  pint: 'pints',
  slice: 'slices',
};

function isPlural(value: number): boolean {
  return formatAmount(value) !== '1' && value > 1;
}

export function formatUnit(unit: string, value: number): string {
  return isPlural(value) ? (UNIT_PLURALS[unit] ?? unit) : unit;
}

export interface ScaledLine {
  /** "1½ cups" — empty when the ingredient has no quantity. */
  amount: string;
  /** "sugar", or a label override such as "milk (last of 3)". */
  name: string;
  note?: string;
}

export function scaleIngredient(
  ingredient: Ingredient,
  { scale, fraction = 1, label }: { scale: number; fraction?: number; label?: string },
): ScaledLine {
  if (ingredient.quantity === undefined) {
    return { amount: '', name: label ?? ingredient.name, note: ingredient.note };
  }
  const value = ingredient.quantity * scale * fraction;
  const amount = ingredient.unit
    ? `${formatAmount(value)} ${formatUnit(ingredient.unit, value)}`
    : formatAmount(value);
  const name = !ingredient.unit && !isPlural(value) && ingredient.singular ? ingredient.singular : ingredient.name;
  return {
    amount,
    name: label ?? name,
    note: ingredient.note,
  };
}

export function findIngredient(recipe: Recipe, ref: string): Ingredient {
  const ingredient = recipe.ingredients.find((i) => i.id === ref);
  if (!ingredient) throw new Error(`Recipe "${recipe.slug}" references unknown ingredient "${ref}"`);
  return ingredient;
}

export function scaleUse(recipe: Recipe, use: IngredientUse, scale: number): ScaledLine {
  return scaleIngredient(findIngredient(recipe, use.ref), {
    scale,
    fraction: use.fraction,
    label: use.label,
  });
}

/** 90 → "1:30", 3725 → "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** 30 → "30 sec", 1200 → "20 min", 5400 → "1 hr 30 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatTimerLength(timer: { seconds: number; maxSeconds?: number }): string {
  if (!timer.maxSeconds) return formatDuration(timer.seconds);
  const a = formatDuration(timer.seconds);
  const b = formatDuration(timer.maxSeconds);
  // "20–25 min" rather than "20 min–25 min"
  const unitA = a.split(' ').slice(1).join(' ');
  const unitB = b.split(' ').slice(1).join(' ');
  return unitA === unitB && !a.includes('hr') ? `${a.split(' ')[0]}–${b}` : `${a} – ${b}`;
}

/** The up-front warning for recipes with night-before steps, or undefined. */
export function nightBeforeNotice(recipe: Recipe): string | undefined {
  const ahead = recipe.steps.filter((s) => s.nightBefore);
  if (!ahead.length) return undefined;
  const first = recipe.steps.indexOf(ahead[0]) + 1;
  return ahead.some((s) => s.nightBefore === 'required')
    ? `Start this the night before (step ${first}).`
    : `Best started the night before (step ${first}), though it works without it.`;
}
