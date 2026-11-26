import { useEffect, useRef, useState } from 'react';

/**
 * Hands-free cook mode: listens for a few short words and turns them into
 * commands. Uses the browser's built-in speech recognition (Chrome on
 * Android, Safari on iPhone). Nothing is recorded or stored by this site.
 */
export type VoiceCommand = 'next' | 'back' | 'repeat' | 'timer' | 'stop' | 'ingredients';

// Checked in order: "stop the timer" must be "stop", not "timer".
const PATTERNS: [VoiceCommand, RegExp][] = [
  ['stop', /\b(stop|quiet|dismiss|silence|cancel alarm)\b/],
  ['timer', /\b(start( the)? timer|set( a)? timer)\b/],
  ['back', /\b(back|previous|last step)\b/],
  ['next', /\b(next|forward|continue)\b/],
  ['repeat', /\b(repeat|read( it)?|say (it )?again)\b/],
  ['ingredients', /\b(ingredients?|what do i need)\b/],
];

export function matchCommand(transcript: string): VoiceCommand | undefined {
  const text = transcript.toLowerCase();
  return PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}

export const voiceSupported = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

export type VoiceStatus = 'off' | 'listening' | 'unsupported' | 'blocked';

/**
 * While `enabled`, listen continuously and call `onCommand` for each command
 * heard. Recognition stops on its own after silence, so it is restarted.
 * `paused` ignores what's heard (used while the site is reading aloud, so it
 * doesn't hear its own "next").
 */
export function useVoiceCommands({
  enabled,
  paused,
  onCommand,
}: {
  enabled: boolean;
  paused: boolean;
  onCommand: (cmd: VoiceCommand, heard: string) => void;
}): { status: VoiceStatus; lastHeard: string } {
  const [status, setStatus] = useState<VoiceStatus>(voiceSupported() ? 'off' : 'unsupported');
  const [lastHeard, setLastHeard] = useState('');
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setStatus('unsupported');
      return;
    }
    if (!enabled) {
      setStatus('off');
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;
    let active = true;
    // One command per spoken phrase: interim results for a phrase share an index.
    const handled = new Set<number>();
    let lastFire = 0;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) setLastHeard(transcript.trim());
        if (handled.has(i) || pausedRef.current) continue;
        const cmd = matchCommand(transcript);
        if (cmd && Date.now() - lastFire > 900) {
          handled.add(i);
          lastFire = Date.now();
          onCommandRef.current(cmd, transcript.trim());
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        active = false;
        setStatus('blocked');
      }
    };
    rec.onend = () => {
      handled.clear();
      if (!active) return;
      try {
        rec.start();
      } catch {
        // Already starting; ignore.
      }
    };
    try {
      rec.start();
      setStatus('listening');
    } catch {
      setStatus('blocked');
    }
    return () => {
      active = false;
      rec.onend = null;
      rec.abort();
    };
  }, [enabled]);

  return { status, lastHeard };
}

/** Read text aloud; `onEnd` fires when it finishes or fails. */
export function speak(text: string, { onStart, onEnd }: { onStart?: () => void; onEnd?: () => void } = {}): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.lang = 'en-US';
  u.onstart = () => onStart?.();
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export const speechSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;
