import type { Recipe } from '../api/types';
import { formatTimerLength, scaleIngredient, scaleUse, type ScaledLine } from './format';

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

/** "1½ cups" → "1 and 1/2 cups", "350°F" → "350 degrees", "2½ × 1¼" → "2 and 1/2 by 1 and 1/4". */
export function forSpeech(text: string): string {
  return text
    .replace(/(\d)([⅛¼⅓⅜½⅝⅔¾⅞])/g, (_, d: string, g: string) => `${d} and ${GLYPHS[g]}`)
    .replace(/[⅛¼⅓⅜½⅝⅔¾⅞]/g, (g) => GLYPHS[g] ?? g)
    .replace(/°\s?F\b/g, ' degrees')
    .replace(/°\s?C\b/g, ' degrees Celsius')
    .replace(/\s×\s/g, ' by ')
    .replace(/&/g, 'and');
}

const lineText = (l: ScaledLine) => [l.amount, l.name].filter(Boolean).join(' ');

/** What cook mode says when it reads a screen aloud. */
export function screenSpeech(recipe: Recipe, index: number, scale: number): string {
  const total = recipe.steps.length;
  if (index === 0) {
    const all = recipe.ingredients.map((i) => lineText(scaleIngredient(i, { scale }))).join(', ');
    return forSpeech(`${recipe.title}. First, gather your ingredients: ${all}. Say next when you're ready.`);
  }
  if (index > total) return forSpeech(`All done. Enjoy your ${recipe.title}!`);
  const step = recipe.steps[index - 1];
  const parts = [`Step ${index} of ${total}. ${step.title}.`];
  if (step.uses?.length) parts.push(`You'll need ${step.uses.map((u) => lineText(scaleUse(recipe, u, scale))).join(', ')}.`);
  parts.push(step.text);
  if (step.checklist?.length) {
    parts.push(
      `In order: ${step.checklist
        .map((c) => (c.use ? lineText(scaleUse(recipe, c.use, scale)) : (c.text ?? '')))
        .join(', then ')}.`,
    );
  }
  for (const t of step.timers ?? []) parts.push(`Say start timer for a ${formatTimerLength(t)} timer.`);
  if (step.tip) parts.push(`Tip: ${step.tip}`);
  return forSpeech(parts.join(' '));
}

export function ingredientsSpeech(recipe: Recipe, index: number, scale: number): string {
  const step = recipe.steps[index - 1];
  const lines = step
    ? (step.uses ?? []).map((u) => lineText(scaleUse(recipe, u, scale)))
    : recipe.ingredients.map((i) => lineText(scaleIngredient(i, { scale })));
  return forSpeech(lines.length ? `You'll need ${lines.join(', ')}.` : 'No ingredients for this step.');
}
