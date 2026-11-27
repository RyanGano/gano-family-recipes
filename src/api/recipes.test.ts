import { describe, expect, it } from 'vitest';
import { allRecipes } from './recipes';
import { splitGlossary } from '../lib/glossary';
import {
  buyList,
  formatAmount,
  formatClock,
  formatMinutes,
  formatTimerLength,
  nightBeforeNotice,
  recipeStamps,
  scaleIngredient,
  scaleUse,
  timeLine,
} from '../lib/format';
import { matchCommand } from '../lib/voice';
import { forSpeech } from '../lib/speech';
import { breakfastPuffs } from './recipes/breakfast-puffs';
import { orangeTwists } from './recipes/orange-twists';

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

  it('links only to recipes in the box, in batches', () => {
    for (const i of recipe.ingredients.filter((x) => x.recipe)) {
      expect(allRecipes.map((r) => r.slug), `ingredient ${i.id} links to ${i.recipe}`).toContain(i.recipe);
      expect(i.recipe).not.toBe(recipe.slug);
      expect(i.unit, `ingredient ${i.id} should be measured in batches`).toBe('batch');
    }
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

  it('shows a range, and a step that uses part of it as an amount', () => {
    const flour = { id: 'flour', section: 'Dough', quantity: 6, maxQuantity: 7.5, unit: 'cup', name: 'bread flour' };
    expect(scaleIngredient(flour, { scale: 1 }).amount).toBe('6–7½ cups');
    expect(scaleIngredient(flour, { scale: 0.5 }).amount).toBe('3–3¾ cups');
    expect(scaleIngredient(flour, { scale: 1, quantity: 2 }).amount).toBe('2 cups');
    expect(scaleIngredient(flour, { scale: 2, quantity: 4, maxQuantity: 5.5 }).amount).toBe('8–11 cups');
  });

  it('formats clocks and timer lengths', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatTimerLength({ seconds: 1200, maxSeconds: 1500 })).toBe('20–25 min');
    expect(formatTimerLength({ seconds: 30 })).toBe('30 sec');
    expect(formatTimerLength({ seconds: 80 })).toBe('1 min 20 sec');
  });
});

describe('night-before notice', () => {
  it('is absent when no step is done the night before', () => {
    expect(nightBeforeNotice(breakfastPuffs)).toBeUndefined();
  });

  it('says optional prep is recommended, not required', () => {
    expect(nightBeforeNotice(orangeTwists)).toBe('Best started the night before (step 1), though it works without it.');
  });

  it('says required prep must be done', () => {
    const steps = orangeTwists.steps.map((s) => (s.nightBefore ? { ...s, nightBefore: 'required' as const } : s));
    expect(nightBeforeNotice({ ...orangeTwists, steps })).toBe('Start this the night before (step 1).');
  });
});

describe('recipe box card extras', () => {
  it('shows hands-off time after the active time', () => {
    expect(timeLine(orangeTwists)).toBe('60 min + 2½ hrs of rising');
    expect(timeLine(breakfastPuffs)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 hr');
    expect(formatMinutes(40)).toBe('40 min');
  });

  it('stamps night-before recipes, plus any stamps of their own', () => {
    expect(recipeStamps(breakfastPuffs)).toEqual([]);
    expect(recipeStamps(orangeTwists)).toEqual(['Start the night before']);
    expect(recipeStamps({ ...orangeTwists, stamps: ['Needs a candy thermometer'] })).toEqual([
      'Start the night before',
      'Needs a candy thermometer',
    ]);
  });

  it('lists what to buy once each, scaled', () => {
    expect(buyList(orangeTwists, 1)).toEqual([
      '1 package yeast',
      '½ cup orange juice',
      'Fresh oranges (for the grated rind)',
      'Almond flavoring',
      'Orange flavoring',
    ]);
    expect(buyList(orangeTwists, 2)[1]).toBe('1 cup orange juice');
    expect(buyList(breakfastPuffs, 1)).toEqual([]);
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
    expect(forSpeech('6–7½ cups')).toBe('6 to 7 and 1/2 cups');
  });
});

describe('glossary', () => {
  it('marks every form of a term, ignoring case', () => {
    const pieces = splitGlossary('Kneading is fun. Seal the lid, then burp it.');
    expect(pieces.map((p) => (typeof p === 'string' ? p : `[${p.term.term}:${p.text}]`))).toEqual([
      '[Knead:Kneading]',
      ' is fun. Seal the lid, then ',
      '[Burp:burp]',
      ' it.',
    ]);
  });

  it('prefers the longest match and leaves partial words alone', () => {
    const pieces = splitGlossary('Punch the dough down; the kneader waits.');
    expect(pieces.map((p) => (typeof p === 'string' ? p : `[${p.term.term}:${p.text}]`))).toEqual([
      '[Punch down:Punch the dough down]',
      '; the kneader waits.',
    ]);
  });
});
