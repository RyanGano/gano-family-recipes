import { useEffect, useState } from 'react';
import { getRecipe, listRecipes } from '../api';
import type { Recipe } from '../api/types';

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
