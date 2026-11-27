import type { Recipe } from '../types';
import { breakfastPuffs } from './breakfast-puffs';
import { chocolateFrosting } from './chocolate-frosting';
import { cinnamonRolls } from './cinnamon-rolls';
import { creamCheeseFrosting } from './cream-cheese-frosting';
import { creamCheeseMints } from './cream-cheese-mints';
import { homemadeBread } from './homemade-bread';
import { orangeTwists } from './orange-twists';

/** Every recipe in the box. Add new recipes here. */
export const allRecipes: Recipe[] = [breakfastPuffs, orangeTwists, cinnamonRolls, homemadeBread, creamCheeseFrosting, chocolateFrosting, creamCheeseMints];
