import type { Recipe } from '../types';

export const creamCheeseFrosting: Recipe = {
  slug: 'cream-cheese-frosting',
  title: 'Cream Cheese Frosting',
  category: 'Desserts',
  tags: ['frosting', 'cream cheese', 'cinnamon rolls'],
  yield: { amount: 2, unit: 'cup' },
  prepMinutes: 10,
  sections: ['Frosting'],
  equipment: ['Mixer and mixing bowl', 'Rubber spatula'],
  ingredients: [
    { id: 'cream-cheese', section: 'Frosting', quantity: 4, unit: 'ounce', name: 'cream cheese', note: 'softened', buy: true },
    { id: 'butter', section: 'Frosting', quantity: 0.25, unit: 'cup', name: 'butter', note: 'softened' },
    { id: 'vanilla', section: 'Frosting', quantity: 1.5, unit: 'teaspoon', name: 'vanilla extract' },
    { id: 'powdered-sugar', section: 'Frosting', quantity: 2.25, unit: 'cup', name: 'powdered sugar' },
  ],
  steps: [
    {
      id: 'soften',
      section: 'Frosting',
      title: 'Soften the cream cheese and butter',
      text: 'Let the cream cheese and butter sit out until soft.',
      uses: [{ ref: 'cream-cheese' }, { ref: 'butter' }],
      tip: 'Set them out 30 to 60 minutes ahead. Cold cream cheese leaves lumps in the frosting.',
    },
    {
      id: 'cream',
      section: 'Frosting',
      title: 'Beat until smooth',
      text: 'In the mixing bowl, beat the cream cheese and butter together until smooth and creamy.',
      uses: [{ ref: 'cream-cheese' }, { ref: 'butter' }],
      timers: [{ label: 'Beat cream cheese and butter', seconds: 2 * 60, doneWhen: 'smooth, with no lumps' }],
    },
    {
      id: 'vanilla',
      section: 'Frosting',
      title: 'Beat in the vanilla',
      text: 'Add the vanilla and beat it in.',
      uses: [{ ref: 'vanilla' }],
    },
    {
      id: 'sugar',
      section: 'Frosting',
      title: 'Add the powdered sugar',
      text: 'Add the powdered sugar a little at a time, beating on low after each addition. You can tap each one as you add it.',
      checklist: [
        { use: { ref: 'powdered-sugar', fraction: 1 / 3, label: 'powdered sugar (1st of 3)' } },
        { use: { ref: 'powdered-sugar', fraction: 1 / 3, label: 'powdered sugar (2nd of 3)' } },
        { use: { ref: 'powdered-sugar', fraction: 1 / 3, label: 'powdered sugar (last of 3)' } },
      ],
      tip: 'Keep the mixer on low while the sugar goes in, or it puffs out of the bowl.',
    },
    {
      id: 'fluffy',
      section: 'Frosting',
      title: 'Beat until fluffy',
      text: 'Turn the mixer up and beat until the frosting is light and fluffy. Scrape down the bowl as you go.',
      timers: [{ label: 'Beat until fluffy', seconds: 60, maxSeconds: 2 * 60, doneWhen: 'light and fluffy' }],
      tip: 'Frost only after whatever you are frosting has cooled, or it melts. Keep leftovers in the fridge.',
    },
  ],
};
