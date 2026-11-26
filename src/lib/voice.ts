import { useCallback, useEffect, useRef, useState } from 'react';

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

/**
 * - `denied`: the browser refused the microphone (or the user tapped "Don't allow").
 * - `no-service`: the microphone is allowed but the browser's speech service refuses
 *   (iPhone: Siri & Dictation off; Edge on Android has no speech service).
 * - `no-mic`: no microphone found.
 * - `stopped`: it was listening, then the browser stopped it; a tap restarts it.
 */
export type VoiceStatus = 'off' | 'starting' | 'listening' | 'unsupported' | 'denied' | 'no-service' | 'no-mic' | 'stopped';

/**
 * Listen continuously and call `onCommand` for each command heard.
 *
 * `start()` must be called straight from a tap handler: phone browsers only
 * show the "allow microphone?" prompt (and only let recognition start) during
 * a user gesture. Recognition ends on its own after silence, so it is
 * restarted from `onend`. `paused` ignores what is heard (used while the site
 * is reading aloud, so it doesn't hear its own "next").
 */
export function useVoiceCommands({
  paused,
  onCommand,
}: {
  paused: boolean;
  onCommand: (cmd: VoiceCommand, heard: string) => void;
}): { status: VoiceStatus; lastHeard: string; start: () => void; stop: () => void } {
  const [status, setStatus] = useState<VoiceStatus>(voiceSupported() ? 'off' : 'unsupported');
  const [lastHeard, setLastHeard] = useState('');
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const stop = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onend = null;
      rec.onerror = null;
      rec.abort();
    }
  }, []);

  const start = useCallback(
    function begin({ micGranted = false }: { micGranted?: boolean } = {}) {
      const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!Ctor) {
        setStatus('unsupported');
        return;
      }
      stop();
      const rec = new Ctor();
      recRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;
      let started = false;
      // One command per spoken phrase: interim results for a phrase share an index.
      const handled = new Set<number>();
      let lastFire = 0;

      const fail = (next: VoiceStatus) => {
        if (recRef.current !== rec) return;
        stop();
        setStatus(next);
      };

      rec.onstart = () => {
        started = true;
        setStatus('listening');
      };
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
        if (e.error === 'audio-capture') return fail('no-mic');
        if (e.error !== 'not-allowed' && e.error !== 'service-not-allowed') return;
        if (started) return fail('stopped');
        if (micGranted || e.error === 'service-not-allowed') return fail('no-service');
        // Some browsers (Chrome/Edge on Android) never show a prompt for speech
        // recognition itself. Ask for the microphone the standard way, then try
        // once more. If the mic is allowed and recognition still refuses, the
        // browser's speech service is the problem, not the permission.
        if (recRef.current !== rec) return;
        stop();
        if (!navigator.mediaDevices?.getUserMedia) return setStatus('denied');
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            stream.getTracks().forEach((t) => t.stop());
            begin({ micGranted: true });
          })
          .catch((err: unknown) => {
            setStatus(err instanceof DOMException && err.name === 'NotFoundError' ? 'no-mic' : 'denied');
          });
      };
      rec.onend = () => {
        handled.clear();
        if (recRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          fail('stopped');
        }
      };
      setStatus('starting');
      try {
        rec.start();
      } catch {
        fail('denied');
      }
    },
    [stop],
  );

  const off = useCallback(() => {
    stop();
    setStatus('off');
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { status, lastHeard, start, stop: off };
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
