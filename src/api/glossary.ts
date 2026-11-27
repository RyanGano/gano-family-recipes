/**
 * Cooking terms a new cook may not know. Wherever one of a term's `forms`
 * appears in step text or a tip, cook mode and the recipe card make the word
 * tappable and show the definition. Add a term here once and every recipe
 * picks it up.
 */
export interface GlossaryTerm {
  /** Shown as the heading of the definition, e.g. "Knead". */
  term: string;
  /** Every spelling to match, case-insensitive, as whole words. */
  forms: string[];
  definition: string;
}

export const glossary: GlossaryTerm[] = [
  {
    term: 'Knead',
    forms: ['knead', 'kneads', 'kneaded', 'kneading'],
    definition:
      'Push the dough away with the heel of your hand, fold it back over itself, give it a quarter turn, and repeat. It makes the dough smooth and stretchy.',
  },
  {
    term: 'Burp',
    forms: ['burp', 'burps', 'burped', 'burping'],
    definition:
      'With the lid sealed, lift one edge a little, press the middle of the lid to push the extra air out, then seal the edge again.',
  },
  {
    term: 'Punch down',
    forms: ['punch down', 'punch the dough down', 'punched down'],
    definition:
      'Press your fist into the risen dough to let the air out, then fold the edges in toward the middle. It evens out the dough before shaping.',
  },
];
