/**
 * The recipe "API".
 *
 * For now recipes live in code (src/api/recipes/*.ts). Everything in the UI
 * goes through these async functions, so moving to a real backend or database
 * later means changing only this file.
 */
import type { Recipe } from './types';
import { allRecipes } from './recipes';

export type { Recipe } from './types';

export async function listRecipes(): Promise<Recipe[]> {
  return [...allRecipes].sort((a, b) => a.title.localeCompare(b.title));
}

export async function getRecipe(slug: string): Promise<Recipe | undefined> {
  return allRecipes.find((r) => r.slug === slug);
}
