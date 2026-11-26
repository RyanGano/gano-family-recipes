import { formatClock } from '../lib/format';
import { go } from '../lib/route';
import { remainingMs, useTimers, type ActiveTimer } from '../lib/timers';

/**
 * Every running timer, always visible. In cook mode it sits above the
 * Back/Next buttons; elsewhere it floats at the bottom of the screen.
 */
export function TimerTray({ placement, currentStep }: { placement: 'floating' | 'docked'; currentStep?: number }) {
  const { timers, now, pause, resume, dismiss } = useTimers();
  if (!timers.length) return null;
  return (
    <div className={`timer-tray timer-tray--${placement}`} aria-live="polite">
      {timers.map((t) => (
        <TimerChip
          key={t.id}
          timer={t}
          now={now}
          here={currentStep === t.step}
          onJump={() => go({ kind: 'cook', slug: t.recipeSlug, step: t.step })}
          onPause={() => (t.phase.kind === 'paused' ? resume(t.id) : pause(t.id))}
          onDismiss={() => dismiss(t.id)}
        />
      ))}
    </div>
  );
}

function TimerChip({
  timer,
  now,
  here,
  onJump,
  onPause,
  onDismiss,
}: {
  timer: ActiveTimer;
  now: number;
  here: boolean;
  onJump: () => void;
  onPause: () => void;
  onDismiss: () => void;
}) {
  const left = remainingMs(timer, now);
  const progress = 1 - left / timer.totalMs;
  const inCheckWindow = timer.checkAtRemainingMs !== undefined && left <= timer.checkAtRemainingMs;
  return (
    <div
      className={`timer-chip is-${timer.phase.kind} ${inCheckWindow ? 'is-checking' : ''}`}
      style={{ backgroundSize: `${Math.min(100, progress * 100)}% 100%` }}
    >
      <button className="timer-chip__main" onClick={onJump} disabled={here} title="Go to this step">
        <span className="timer-chip__label">{timer.label}</span>
        <span className="timer-chip__time">{formatClock(left / 1000)}</span>
        {inCheckWindow && timer.phase.kind === 'running' && <span className="timer-chip__hint">check now</span>}
      </button>
      {timer.phase.kind !== 'ringing' && (
        <button className="icon-btn" onClick={onPause} aria-label={timer.phase.kind === 'paused' ? 'Resume timer' : 'Pause timer'}>
          {timer.phase.kind === 'paused' ? '▶' : '❚❚'}
        </button>
      )}
      <button className="icon-btn" onClick={onDismiss} aria-label="Cancel timer">
        ✕
      </button>
    </div>
  );
}

/** Full-screen "Timer done!" alert that keeps ringing until dismissed. */
export function RingingAlert() {
  const { timers, dismiss, addTime } = useTimers();
  const ringing = timers.find((t) => t.phase.kind === 'ringing');
  if (!ringing) return null;
  return (
    <div className="ringing" role="alertdialog" aria-labelledby="ringing-title">
      <div className="ringing__card">
        <div className="ringing__bell" aria-hidden>
          ⏰
        </div>
        <h2 id="ringing-title" className="hand-title">
          {ringing.label} — time's up!
        </h2>
        {ringing.doneWhen && <p className="ringing__hint">Look for: {ringing.doneWhen}</p>}
        <div className="ringing__actions">
          <button className="btn btn--primary btn--big" onClick={() => dismiss(ringing.id)}>
            Got it
          </button>
          <button className="btn btn--ghost" onClick={() => addTime(ringing.id, 60_000)}>
            +1 minute
          </button>
          <button className="btn btn--ghost" onClick={() => addTime(ringing.id, 5 * 60_000)}>
            +5 minutes
          </button>
        </div>
      </div>
    </div>
  );
}
