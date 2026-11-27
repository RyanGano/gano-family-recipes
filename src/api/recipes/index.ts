import type { Recipe } from '../types';
import { breakfastPuffs } from './breakfast-puffs';
import { cinnamonRolls } from './cinnamon-rolls';
import { homemadeBread } from './homemade-bread';
import { orangeTwists } from './orange-twists';

/** Every recipe in the box. Add new recipes here. */
export const allRecipes: Recipe[] = [breakfastPuffs, orangeTwists, cinnamonRolls, homemadeBread];
