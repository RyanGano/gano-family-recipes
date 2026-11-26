import { useCallback, useEffect, useState } from 'react';

/**
 * localStorage is a boundary: whatever is stored may be stale, from an older
 * version of the site, or hand-edited. Every read goes through a parser that
 * returns the fallback when the shape is wrong.
 */
export function readStored<T>(key: string, parse: (raw: unknown) => T | undefined, fallback: T): T {
  try {
    const text = window.localStorage.getItem(key);
    if (text === null) return fallback;
    return parse(JSON.parse(text)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: preferences just won't persist.
  }
}

export const parseBoolean = (raw: unknown): boolean | undefined => (typeof raw === 'boolean' ? raw : undefined);
export const parseNumber = (raw: unknown): number | undefined =>
  typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
export const parseStringArray = (raw: unknown): string[] | undefined =>
  Array.isArray(raw) && raw.every((x) => typeof x === 'string') ? raw : undefined;

/** useState that survives reloads. */
export function useStored<T>(
  key: string,
  parse: (raw: unknown) => T | undefined,
  fallback: T,
): [T, (next: T) => void] {
  // The value is kept together with the key it belongs to, so switching keys
  // (e.g. moving to another recipe) re-reads instead of writing the old value
  // under the new key.
  const [state, setState] = useState(() => ({ key, value: readStored(key, parse, fallback) }));
  let current = state;
  if (state.key !== key) {
    current = { key, value: readStored(key, parse, fallback) };
    setState(current);
  }
  useEffect(() => {
    if (state.key === key) writeStored(state.key, state.value);
  }, [key, state]);
  const set = useCallback((next: T) => setState((s) => ({ key: s.key, value: next })), []);
  return [current.value, set];
}
