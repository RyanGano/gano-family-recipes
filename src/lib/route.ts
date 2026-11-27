import { useEffect, useState } from 'react';

/**
 * Path routes (no `#`). GitHub Pages serves 404.html — a copy of index.html — for any
 * deep link, so the app boots and reads the path itself.
 *   /                          recipe box
 *   /recipe/<slug>             recipe card
 *   /recipe/<slug>/cook/<n>    cook mode, step n (0 = "gather" screen)
 */
export type Route =
  | { kind: 'box' }
  | { kind: 'recipe'; slug: string }
  | { kind: 'cook'; slug: string; step: number };

export function parseRoute(path: string): Route {
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
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
      return '/';
    case 'recipe':
      return `/recipe/${encodeURIComponent(route.slug)}`;
    case 'cook':
      return `/recipe/${encodeURIComponent(route.slug)}/cook/${route.step}`;
    default: {
      const _exhaustive: never = route;
      return _exhaustive;
    }
  }
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function navigate(path: string, replace: boolean): void {
  if (path === window.location.pathname) return;
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  notify();
}

/** Navigate. `replace` swaps the history entry so step changes don't flood "back". */
export function go(route: Route, { replace = false }: { replace?: boolean } = {}): void {
  navigate(href(route), replace);
}

// Plain same-origin <a href="/…"> clicks become in-app navigations instead of page loads.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.('a');
  if (!a || a.target || a.hasAttribute('download')) return;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  e.preventDefault();
  navigate(url.pathname, false);
});

window.addEventListener('popstate', notify);

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.pathname));
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return route;
}
