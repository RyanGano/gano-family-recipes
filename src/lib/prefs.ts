import { parseNumber, parseStringArray, useStored } from './storage';

export const SCALES = [0.5, 1, 2, 3] as const;

export const scaleKey = (slug: string) => `scale.${slug}`;

/** How many batches to make; remembered per recipe. */
export const useScale = (slug: string) => useStored(scaleKey(slug), parseNumber, 1);

/** Ingredients and checklist items ticked off; remembered per recipe until "start over". */
export const useChecked = (slug: string) => useStored(`checked.${slug}`, parseStringArray, []);

/** Last cook-mode step visited, so the recipe card can offer "pick up where you left off". */
export const useLastStep = (slug: string) => useStored(`lastStep.${slug}`, parseNumber, 0);

/** 0 = normal, 1 = large, 2 = extra large. */
export const useTextSize = () => useStored('textSize', parseNumber, 1);

export function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
