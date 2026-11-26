import { useWakeLock } from '../lib/wakeLock';

/** Small pill showing whether the screen is being kept awake; tap to toggle. */
export function WakeToggle({ compact = false }: { compact?: boolean }) {
  const { state, enabled, setEnabled } = useWakeLock();
  if (state === 'unsupported') return null;
  const label = !enabled ? 'Screen may sleep' : state === 'on' ? 'Screen stays on' : 'Tap to keep screen on';
  return (
    <button
      className={`pill wake-pill ${enabled && state === 'on' ? 'is-on' : ''}`}
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      title={label}
    >
      <span aria-hidden>{enabled ? '☀︎' : '☾'}</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}
