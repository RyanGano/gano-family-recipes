import { useEffect, useMemo, useState } from 'react';
import { getRecipe, listRecipes } from '../api';
import type { Recipe } from '../api/types';
import { cookSteps, type CookStep } from './cookSteps';

export type Loadable<T> = { kind: 'loading' } | { kind: 'ready'; value: T } | { kind: 'missing' };

export function useRecipeList(): Loadable<Recipe[]> {
  const [state, setState] = useState<Loadable<Recipe[]>>({ kind: 'loading' });
  useEffect(() => {
    let live = true;
    void listRecipes().then((value) => live && setState({ kind: 'ready', value }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

/** The cook-mode step screens for a recipe, with linked recipes folded in. Undefined while loading. */
export function useCookSteps(recipe: Recipe | undefined): CookStep[] | undefined {
  const list = useRecipeList();
  return useMemo(
    () => (recipe && list.kind === 'ready' ? cookSteps(recipe, list.value) : undefined),
    [recipe, list],
  );
}

export function useRecipe(slug: string): Loadable<Recipe> {
  const [state, setState] = useState<Loadable<Recipe>>({ kind: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    void getRecipe(slug).then((value) => {
      if (live) setState(value ? { kind: 'ready', value } : { kind: 'missing' });
    });
    return () => {
      live = false;
    };
  }, [slug]);
  return state;
}
