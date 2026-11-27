import type { CSSProperties } from 'react';

/**
 * A small, steady wobble for things stuck on a card by hand (stamps, snapshots).
 * The same seed always lands the same way, so a card doesn't shuffle between visits.
 */
export function handPlaced(seed: string, { tilt, shift }: { tilt: [number, number]; shift: number }): CSSProperties {
  const r = rand(seed);
  // Never quite straight: pick a lean, then how far.
  const lean = (r() < 0.5 ? -1 : 1) * (tilt[0] + r() * (tilt[1] - tilt[0]));
  const dx = (r() * 2 - 1) * shift;
  const dy = (r() * 2 - 1) * shift;
  return { '--tilt': `${lean.toFixed(1)}deg`, '--dx': `${dx.toFixed(1)}px`, '--dy': `${dy.toFixed(1)}px` } as CSSProperties;
}

/** Seeded random numbers in [0, 1): an FNV-1a hash of the seed feeding mulberry32. */
function rand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
