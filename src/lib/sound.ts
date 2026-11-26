/**
 * Kitchen-timer sounds made with Web Audio, so there are no audio files to
 * load. Mobile browsers only allow sound after a tap, so `unlockAudio()` is
 * called from the "start timer" button.
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume();
}

function tone(c: AudioContext, { at, freq, length }: { at: number; freq: number; length: number }) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

/** A bright three-note "ding-ding-ding" for a finished timer. */
export function playAlarm(): void {
  const c = context();
  if (c) {
    const t = c.currentTime;
    [0, 0.25, 0.5].forEach((d) => tone(c, { at: t + d, freq: 1046, length: 0.22 }));
  }
  navigator.vibrate?.([300, 120, 300, 120, 300]);
}

/** A softer two-note chime for "check now" at the start of a time range. */
export function playChime(): void {
  const c = context();
  if (c) {
    const t = c.currentTime;
    tone(c, { at: t, freq: 784, length: 0.35 });
    tone(c, { at: t + 0.3, freq: 1046, length: 0.5 });
  }
  navigator.vibrate?.([200, 100, 200]);
}

/** A tiny click when voice control hears a command. */
export function playBlip(): void {
  const c = context();
  if (c) tone(c, { at: c.currentTime, freq: 660, length: 0.08 });
}
