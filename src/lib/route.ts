import { useEffect, useState } from 'react';

/**
 * Hash routes, so GitHub Pages never has to know about deep links.
 *   #/                         recipe box
 *   #/recipe/<slug>            recipe card
 *   #/recipe/<slug>/cook/<n>   cook mode, step n (0 = "gather" screen)
 */
export type Route =
  | { kind: 'box' }
  | { kind: 'recipe'; slug: string }
  | { kind: 'cook'; slug: string; step: number };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'recipe' && parts[1]) {
    if (parts[2] === 'cook') {
      const step = Number.parseInt(parts[3] ?? '0', 10);
      return { kind: 'cook', slug: parts[1], step: Number.isFinite(step) && step >= 0 ? step : 0 };
    }
    return { kind: 'recipe', slug: parts[1] };
  }
  return { kind: 'box' };
}

export function href(route: Route): string {
  switch (route.kind) {
    case 'box':
      return '#/';
    case 'recipe':
      return `#/recipe/${encodeURIComponent(route.slug)}`;
    case 'cook':
      return `#/recipe/${encodeURIComponent(route.slug)}/cook/${route.step}`;
    default: {
      const _exhaustive: never = route;
      return _exhaustive;
    }
  }
}

/** Navigate. `replace` swaps the history entry so step changes don't flood "back". */
export function go(route: Route, { replace = false }: { replace?: boolean } = {}): void {
  const target = href(route);
  if (replace) window.location.replace(target);
  else window.location.hash = target;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
