import type { Recipe } from '../types';
import { breakfastPuffs } from './breakfast-puffs';
import { orangeTwists } from './orange-twists';

/** Every recipe in the box. Add new recipes here. */
export const allRecipes: Recipe[] = [breakfastPuffs, orangeTwists];
