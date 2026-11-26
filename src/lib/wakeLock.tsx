import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { parseBoolean, useStored } from './storage';

export type WakeState = 'on' | 'off' | 'unsupported' | 'waiting';

interface WakeLockApi {
  state: WakeState;
  enabled: boolean;
  setEnabled: (on: boolean) => void;
}

const WakeLockContext = createContext<WakeLockApi>({ state: 'unsupported', enabled: false, setEnabled: () => {} });

/**
 * Keeps the phone screen on for as long as the site is open (on by default).
 * The lock is dropped by the browser whenever the tab is hidden, so it is
 * re-requested when the page becomes visible again, and on the first tap for
 * browsers that only grant it after a user gesture.
 */
export function WakeLockProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useStored('wakeLock.enabled', parseBoolean, true);
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [state, setState] = useState<WakeState>(supported ? 'waiting' : 'unsupported');

  useEffect(() => {
    if (!supported) return;
    if (!enabled) {
      setState('off');
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        setState('on');
        sentinel.addEventListener('release', () => {
          if (!cancelled) setState('waiting');
        });
      } catch {
        setState('waiting');
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', acquire);
    window.addEventListener('pointerdown', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      window.removeEventListener('pointerdown', acquire);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [enabled, supported]);

  return <WakeLockContext.Provider value={{ state, enabled, setEnabled }}>{children}</WakeLockContext.Provider>;
}

export const useWakeLock = () => useContext(WakeLockContext);
