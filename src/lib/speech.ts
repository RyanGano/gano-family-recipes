import type { Recipe } from '../api/types';
import type { CookStep } from './cookSteps';
import { formatTimerLength, nightBeforeNotice, scaleIngredient, scaleUse, type ScaledLine } from './format';

const GLYPHS: Record<string, string> = {
  '⅛': '1/8',
  '¼': '1/4',
  '⅓': '1/3',
  '⅜': '3/8',
  '½': '1/2',
  '⅝': '5/8',
  '⅔': '2/3',
  '¾': '3/4',
  '⅞': '7/8',
};

/** "1½ cups" → "1 and 1/2 cups", "6–7½" → "6 to 7 and 1/2", "350°F" → "350 degrees", "2½ × 1¼" → "2 and 1/2 by 1 and 1/4". */
export function forSpeech(text: string): string {
  return text
    .replace(/(\d)([⅛¼⅓⅜½⅝⅔¾⅞])/g, (_, d: string, g: string) => `${d} and ${GLYPHS[g]}`)
    .replace(/[⅛¼⅓⅜½⅝⅔¾⅞]/g, (g) => GLYPHS[g] ?? g)
    .replace(/(\d)\s?–\s?(\d)/g, '$1 to $2')
    .replace(/°\s?F\b/g, ' degrees')
    .replace(/°\s?C\b/g, ' degrees Celsius')
    .replace(/\s×\s/g, ' by ')
    .replace(/&/g, 'and');
}

const lineText = (l: ScaledLine) => [l.amount, l.name].filter(Boolean).join(' ');

/** What cook mode says when it reads a screen aloud. `screens` comes from `cookSteps`. */
export function screenSpeech(recipe: Recipe, screens: CookStep[], index: number, scale: number): string {
  const total = screens.length;
  if (index === 0) {
    const all = gatherLines(recipe, screens, scale).join(', ');
    const ahead = nightBeforeNotice(recipe);
    return forSpeech(`${recipe.title}. ${ahead ? `${ahead} ` : ''}First, gather your ingredients: ${all}. Say next when you're ready.`);
  }
  if (index > total) return forSpeech(`All done. Enjoy your ${recipe.title}!`);
  const { step, owner, factor, num, part } = screens[index - 1];
  const amount = scale * factor;
  const parts = [`Step ${num} of ${recipe.steps.length}.`];
  if (part) parts.push(`${part.recipe.title}, ${part.n} of ${part.of}.`);
  parts.push(`${step.title}.`);
  if (step.nightBefore) parts.push(step.nightBefore === 'required' ? 'Do this the night before.' : 'Best done the night before.');
  if (step.uses?.length) parts.push(`You'll need ${step.uses.map((u) => lineText(scaleUse(owner, u, amount))).join(', ')}.`);
  parts.push(step.text);
  if (step.checklist?.length) {
    parts.push(
      `In order: ${step.checklist
        .map((c) => (c.use ? lineText(scaleUse(owner, c.use, amount)) : (c.text ?? '')))
        .join(', then ')}.`,
    );
  }
  for (const t of step.timers ?? []) parts.push(`Say start timer for a ${formatTimerLength(t)} timer.`);
  if (step.tip) parts.push(`Tip: ${step.tip}`);
  return forSpeech(parts.join(' '));
}

/** Every ingredient line for the gather screen, including those of folded-in recipes. */
function gatherLines(recipe: Recipe, screens: CookStep[], scale: number): string[] {
  return recipe.ingredients.flatMap((i) => {
    const line = lineText(scaleIngredient(i, { scale }));
    const folded = screens.find((s) => s.part?.ingredient === i);
    if (!folded?.part) return [line];
    const parts = folded.part.recipe.ingredients.map((x) => lineText(scaleIngredient(x, { scale: scale * folded.factor })));
    return [`${line}, made from ${parts.join(', ')}`];
  });
}

export function ingredientsSpeech(recipe: Recipe, screens: CookStep[], index: number, scale: number): string {
  const screen = screens[index - 1];
  const lines = screen
    ? (screen.step.uses ?? []).map((u) => lineText(scaleUse(screen.owner, u, scale * screen.factor)))
    : gatherLines(recipe, screens, scale);
  return forSpeech(lines.length ? `You'll need ${lines.join(', ')}.` : 'No ingredients for this step.');
}
