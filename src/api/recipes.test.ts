import { describe, expect, it } from 'vitest';
import { allRecipes } from './recipes';
import { formatAmount, formatClock, formatTimerLength, scaleIngredient, scaleUse } from '../lib/format';
import { matchCommand } from '../lib/voice';
import { forSpeech } from '../lib/speech';
import { breakfastPuffs } from './recipes/breakfast-puffs';

// Every recipe in the box must be internally consistent. These checks are
// what the add-recipe skill relies on to catch mistakes.
describe.each(allRecipes.map((r) => [r.slug, r] as const))('recipe %s', (_slug, recipe) => {
  it('has a url-safe slug', () => {
    expect(recipe.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('uses unique ingredient and step ids', () => {
    const ing = recipe.ingredients.map((i) => i.id);
    const steps = recipe.steps.map((s) => s.id);
    expect(new Set(ing).size).toBe(ing.length);
    expect(new Set(steps).size).toBe(steps.length);
  });

  it('only references sections that exist', () => {
    for (const x of [...recipe.ingredients, ...recipe.steps]) expect(recipe.sections).toContain(x.section);
  });

  it('only references ingredients that exist', () => {
    const ids = new Set(recipe.ingredients.map((i) => i.id));
    for (const step of recipe.steps) {
      for (const u of step.uses ?? []) expect(ids, `${step.id} → ${u.ref}`).toContain(u.ref);
      for (const c of step.checklist ?? []) {
        if (c.use) expect(ids, `${step.id} checklist → ${c.use.ref}`).toContain(c.use.ref);
        else expect(c.text, `${step.id} checklist item needs text or use`).toBeTruthy();
      }
    }
  });

  it('uses every ingredient in at least one step', () => {
    const used = new Set(
      recipe.steps.flatMap((s) => [...(s.uses ?? []), ...(s.checklist ?? []).flatMap((c) => (c.use ? [c.use] : []))]).map((u) => u.ref),
    );
    for (const i of recipe.ingredients) expect(used, `ingredient ${i.id} is never used`).toContain(i.id);
  });

  it('has sensible timers', () => {
    for (const t of recipe.steps.flatMap((s) => s.timers ?? [])) {
      expect(t.seconds).toBeGreaterThan(0);
      if (t.maxSeconds !== undefined) expect(t.maxSeconds).toBeGreaterThan(t.seconds);
    }
  });

  it('has unique slugs across the box', () => {
    expect(allRecipes.filter((r) => r.slug === recipe.slug)).toHaveLength(1);
  });
});

describe('amount formatting', () => {
  it('turns decimals into kitchen fractions', () => {
    expect(formatAmount(0.5)).toBe('½');
    expect(formatAmount(1 / 3)).toBe('⅓');
    expect(formatAmount(1.5)).toBe('1½');
    expect(formatAmount(2 / 3 + 2)).toBe('2⅔');
    expect(formatAmount(2.97)).toBe('3');
    expect(formatAmount(0.01)).toBe('⅛');
  });

  it('scales and pluralises', () => {
    const flour = breakfastPuffs.ingredients.find((i) => i.id === 'flour')!;
    expect(scaleIngredient(flour, { scale: 0.5 })).toEqual({ amount: '1½ cups', name: 'all-purpose flour', note: undefined });
    const salt = breakfastPuffs.ingredients.find((i) => i.id === 'salt')!;
    expect(scaleIngredient(salt, { scale: 2 }).amount).toBe('1 teaspoon');
    const eggs = breakfastPuffs.ingredients.find((i) => i.id === 'eggs')!;
    expect(scaleIngredient(eggs, { scale: 0.5 })).toEqual({ amount: '1', name: 'egg', note: undefined });
  });

  it('shows a third of the milk for alternating additions', () => {
    expect(scaleUse(breakfastPuffs, { ref: 'milk', fraction: 1 / 3, label: 'milk (1st of 3)' }, 1)).toEqual({
      amount: '⅓ cup',
      name: 'milk (1st of 3)',
      note: undefined,
    });
    expect(scaleUse(breakfastPuffs, { ref: 'milk', fraction: 1 / 3 }, 2).amount).toBe('⅔ cup');
  });

  it('formats clocks and timer lengths', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatTimerLength({ seconds: 1200, maxSeconds: 1500 })).toBe('20–25 min');
    expect(formatTimerLength({ seconds: 30 })).toBe('30 sec');
  });
});

describe('voice commands', () => {
  it.each([
    ['next', 'next'],
    ['Next step please', 'next'],
    ['go back', 'back'],
    ['previous', 'back'],
    ['start the timer', 'timer'],
    ['stop the timer', 'stop'],
    ['repeat that', 'repeat'],
    ['what do I need', 'ingredients'],
    ['the puffs look great', undefined],
  ])('"%s" → %s', (heard, expected) => {
    expect(matchCommand(heard)).toBe(expected);
  });
});

describe('speech text', () => {
  it('reads fractions and temperatures naturally', () => {
    expect(forSpeech('1½ cups and ½ teaspoon at 350°F')).toBe('1 and 1/2 cups and 1/2 teaspoon at 350 degrees');
  });
});
