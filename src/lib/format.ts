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
  batch: 'batches',
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
  {
    scale,
    fraction = 1,
    label,
    quantity,
    maxQuantity,
  }: { scale: number; fraction?: number; label?: string; quantity?: number; maxQuantity?: number },
): ScaledLine {
  const base = quantity ?? ingredient.quantity;
  if (base === undefined) {
    return { amount: '', name: label ?? ingredient.name, note: ingredient.note };
  }
  const top = quantity !== undefined ? maxQuantity : ingredient.maxQuantity;
  const factor = scale * (quantity !== undefined ? 1 : fraction);
  const value = base * factor;
  const high = top === undefined ? undefined : top * factor;
  const number = high === undefined ? formatAmount(value) : `${formatAmount(value)}–${formatAmount(high)}`;
  const amount = ingredient.unit ? `${number} ${formatUnit(ingredient.unit, high ?? value)}` : number;
  const name =
    !ingredient.unit && !isPlural(high ?? value) && ingredient.singular ? ingredient.singular : ingredient.name;
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
    quantity: use.quantity,
    maxQuantity: use.maxQuantity,
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

/** 30 → "30 sec", 80 → "1 min 20 sec", 1200 → "20 min", 5400 → "1 hr 30 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 600 && seconds % 60) return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
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

/** "40 min", "1 hr", "2½ hrs", and whole days from 24 hrs up ("2 days"). */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes >= 24 * 60) {
    const days = minutes / (24 * 60);
    return `${formatAmount(days)} ${days === 1 ? 'day' : 'days'}`;
  }
  const hours = minutes / 60;
  return `${formatAmount(hours)} ${hours === 1 ? 'hr' : 'hrs'}`;
}

/** "60 min + 2½ hrs of rising", "60 min", or "" when the recipe gives no times. */
export function timeLine(recipe: Recipe): string {
  const active = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const parts = active ? [`${active} min`] : [];
  if (recipe.waitTime) parts.push(`${formatMinutes(recipe.waitTime.minutes)} of ${recipe.waitTime.label}`);
  return parts.join(' + ');
}

/** The rubber stamps for the recipe box card. */
export function recipeStamps(recipe: Recipe): string[] {
  const nightBefore = recipe.steps.some((s) => s.nightBefore) ? ['Start the night before'] : [];
  return [...nightBefore, ...(recipe.stamps ?? [])];
}

/** The "What you might need to buy" list, scaled, one line per thing to buy. */
export function buyList(recipe: Recipe, scale: number): string[] {
  const lines: string[] = [];
  for (const ing of recipe.ingredients) {
    if (!ing.buy) continue;
    let line =
      ing.buy === true
        ? (({ amount, name }) => [amount, name].filter(Boolean).join(' '))(scaleIngredient(ing, { scale }))
        : ing.buy;
    line = line.charAt(0).toUpperCase() + line.slice(1);
    if (!lines.includes(line)) lines.push(line);
  }
  return lines;
}
