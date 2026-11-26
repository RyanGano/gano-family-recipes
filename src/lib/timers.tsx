import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Timer } from '../api/types';
import { playAlarm, playChime, unlockAudio } from './sound';
import { readStored, writeStored } from './storage';

/**
 * Kitchen timers that keep running while you move between steps (and survive
 * a page reload, because they store the wall-clock time they end at).
 */
export type TimerPhase =
  | { kind: 'running'; endsAt: number }
  | { kind: 'paused'; remainingMs: number }
  | { kind: 'ringing' };

export interface ActiveTimer {
  id: string;
  label: string;
  doneWhen?: string;
  recipeSlug: string;
  /** Cook-mode step index this timer belongs to (for "jump to step"). */
  step: number;
  totalMs: number;
  /** For ranges: ms *remaining* when the "check now" chime should fire. */
  checkAtRemainingMs?: number;
  checked: boolean;
  phase: TimerPhase;
}

interface TimersApi {
  timers: ActiveTimer[];
  now: number;
  start: (args: { timer: Timer; recipeSlug: string; step: number }) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  addTime: (id: string, ms: number) => void;
  dismiss: (id: string) => void;
  /** Silence everything that is ringing. Used by voice command "stop". */
  dismissRinging: () => void;
}

const STORAGE_KEY = 'timers.v1';
// Captured once: the effect below swaps the title, so reading it later could capture the swapped one.
const PAGE_TITLE = typeof document === 'undefined' ? '' : document.title;

export function remainingMs(t: ActiveTimer, now: number): number {
  switch (t.phase.kind) {
    case 'running':
      return Math.max(0, t.phase.endsAt - now);
    case 'paused':
      return t.phase.remainingMs;
    case 'ringing':
      return 0;
    default: {
      const _exhaustive: never = t.phase;
      return _exhaustive;
    }
  }
}

function parsePhase(raw: unknown): TimerPhase | undefined {
  if (typeof raw !== 'object' || raw === null || !('kind' in raw)) return undefined;
  if (raw.kind === 'running' && 'endsAt' in raw && typeof raw.endsAt === 'number') {
    return { kind: 'running', endsAt: raw.endsAt };
  }
  if (raw.kind === 'paused' && 'remainingMs' in raw && typeof raw.remainingMs === 'number') {
    return { kind: 'paused', remainingMs: raw.remainingMs };
  }
  if (raw.kind === 'ringing') return { kind: 'ringing' };
  return undefined;
}

function parseTimer(raw: unknown): ActiveTimer | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r: Record<string, unknown> = { ...raw };
  const phase = parsePhase(r.phase);
  if (
    typeof r.id !== 'string' ||
    typeof r.label !== 'string' ||
    typeof r.recipeSlug !== 'string' ||
    typeof r.step !== 'number' ||
    typeof r.totalMs !== 'number' ||
    !phase
  ) {
    return undefined;
  }
  return {
    id: r.id,
    label: r.label,
    doneWhen: typeof r.doneWhen === 'string' ? r.doneWhen : undefined,
    recipeSlug: r.recipeSlug,
    step: r.step,
    totalMs: r.totalMs,
    checkAtRemainingMs: typeof r.checkAtRemainingMs === 'number' ? r.checkAtRemainingMs : undefined,
    checked: r.checked === true,
    phase,
  };
}

function parseTimers(raw: unknown): ActiveTimer[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map(parseTimer).filter((t): t is ActiveTimer => t !== undefined);
}

const TimersContext = createContext<TimersApi | null>(null);

export function TimersProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<ActiveTimer[]>(() => readStored(STORAGE_KEY, parseTimers, []));
  const [now, setNow] = useState(() => Date.now());
  const timersRef = useRef(timers);
  timersRef.current = timers;

  useEffect(() => {
    writeStored(STORAGE_KEY, timers);
  }, [timers]);

  // Tick, fire chimes, and flip finished timers to "ringing".
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      let changed = false;
      const next = timersRef.current.map((timer) => {
        if (timer.phase.kind !== 'running') return timer;
        const left = timer.phase.endsAt - t;
        if (left <= 0) {
          changed = true;
          return { ...timer, phase: { kind: 'ringing' as const } };
        }
        if (!timer.checked && timer.checkAtRemainingMs !== undefined && left <= timer.checkAtRemainingMs) {
          changed = true;
          playChime();
          return { ...timer, checked: true };
        }
        return timer;
      });
      if (changed) setTimers(next);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // Keep ringing every few seconds until someone dismisses it.
  const anyRinging = timers.some((t) => t.phase.kind === 'ringing');
  useEffect(() => {
    if (!anyRinging) return;
    playAlarm();
    const id = window.setInterval(playAlarm, 2500);
    const title = PAGE_TITLE;
    document.title = '⏰ Timer done!';
    return () => {
      window.clearInterval(id);
      document.title = title;
    };
  }, [anyRinging]);

  const update = useCallback((id: string, fn: (t: ActiveTimer) => ActiveTimer) => {
    setTimers((all) => all.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const api = useMemo<TimersApi>(
    () => ({
      timers,
      now,
      start: ({ timer, recipeSlug, step }) => {
        unlockAudio();
        const totalMs = (timer.maxSeconds ?? timer.seconds) * 1000;
        const id = `${recipeSlug}:${step}:${timer.label}`;
        const fresh: ActiveTimer = {
          id,
          label: timer.label,
          doneWhen: timer.doneWhen,
          recipeSlug,
          step,
          totalMs,
          checkAtRemainingMs: timer.maxSeconds ? (timer.maxSeconds - timer.seconds) * 1000 : undefined,
          checked: false,
          phase: { kind: 'running', endsAt: Date.now() + totalMs },
        };
        setTimers((all) => [...all.filter((t) => t.id !== id), fresh]);
      },
      pause: (id) =>
        update(id, (t) =>
          t.phase.kind === 'running' ? { ...t, phase: { kind: 'paused', remainingMs: remainingMs(t, Date.now()) } } : t,
        ),
      resume: (id) =>
        update(id, (t) => {
          unlockAudio();
          return t.phase.kind === 'paused'
            ? { ...t, phase: { kind: 'running', endsAt: Date.now() + t.phase.remainingMs } }
            : t;
        }),
      addTime: (id, ms) =>
        update(id, (t) => {
          const base = remainingMs(t, Date.now());
          const phase: TimerPhase =
            t.phase.kind === 'paused'
              ? { kind: 'paused', remainingMs: base + ms }
              : { kind: 'running', endsAt: Date.now() + base + ms };
          return { ...t, totalMs: Math.max(t.totalMs, base + ms), phase };
        }),
      dismiss: (id) => setTimers((all) => all.filter((t) => t.id !== id)),
      dismissRinging: () => setTimers((all) => all.filter((t) => t.phase.kind !== 'ringing')),
    }),
    [timers, now, update],
  );

  return <TimersContext.Provider value={api}>{children}</TimersContext.Provider>;
}

export function useTimers(): TimersApi {
  const api = useContext(TimersContext);
  if (!api) throw new Error('useTimers must be used inside <TimersProvider>');
  return api;
}
