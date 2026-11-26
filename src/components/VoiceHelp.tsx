import type { VoiceStatus } from '../lib/voice';

export type VoiceProblem = Extract<VoiceStatus, 'denied' | 'no-service' | 'no-mic' | 'stopped'>;

export function isVoiceProblem(status: VoiceStatus): status is VoiceProblem {
  return status === 'denied' || status === 'no-service' || status === 'no-mic' || status === 'stopped';
}

type Platform = 'iphone' | 'android' | 'other';

const ua = () => navigator.userAgent;

/** Android browsers other than Chrome (Edge, Samsung Internet, …) often lack a working speech service. */
const isAndroidNonChrome = () => /Android/.test(ua()) && /EdgA|SamsungBrowser|Firefox|OPR|YaBrowser/.test(ua());
/** On iPhone only Safari has speech recognition; Chrome/Edge/Firefox there don't. */
const isIphoneNonSafari = () => /CriOS|EdgiOS|FxiOS|OPiOS/.test(ua());

/** Opens the current page and step in Chrome on Android. */
function chromeIntentUrl(): string {
  const { host, pathname, hash } = window.location;
  return `intent://${host}${pathname}?go=${encodeURIComponent(hash)}#Intent;scheme=https;package=com.android.chrome;end`;
}

function detectPlatform(): Platform {
  // iPadOS reports itself as a Mac, so also check for a touch screen.
  if (/iPhone|iPad|iPod/.test(ua()) || (/Macintosh/.test(ua()) && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/Android/.test(ua())) return 'android';
  return 'other';
}

const ALLOW_MIC: Record<Platform, string[]> = {
  iphone: [
    'Tap the “aA” (or page settings) button in the address bar.',
    'Tap “Website Settings”.',
    'Set Microphone to “Allow” (or “Ask”).',
    'If that isn’t there: open the Settings app → Apps → Safari → Microphone → “Ask” or “Allow”.',
  ],
  android: [
    'Tap the icon just left of the web address.',
    'Tap “Permissions” (or “Site settings”).',
    'Turn Microphone on.',
    'If Chrome itself can’t use the mic: Settings app → Apps → Chrome → Permissions → Microphone → Allow.',
  ],
  other: [
    'Click the icon just left of the web address.',
    'Set Microphone to “Allow” for this site.',
  ],
};

const TURN_ON_DICTATION: Record<Platform, string[]> = {
  iphone: [
    'Open the Settings app → General → Keyboard.',
    'Turn on “Enable Dictation”.',
    'Also check Settings → Siri: voice recognition needs Siri & Dictation available.',
  ],
  android: ['Open the Settings app → Apps → Google → Permissions → Microphone → Allow.', 'Make sure “Speech Services by Google” is installed and up to date.'],
  other: ['Voice control needs the browser’s speech service. Chrome, Edge and Safari support it.'],
};

/**
 * Shown when voice control can't start. Says why in plain words, how to fix
 * it on this kind of phone, and offers a "Try again" button (a fresh tap is
 * what lets the browser show its "Allow microphone?" prompt).
 */
export function VoiceHelp({ problem, onRetry, onClose }: { problem: VoiceProblem; onRetry: () => void; onClose: () => void }) {
  const platform = detectPlatform();
  const { title, intro, steps } = describe(problem, platform);
  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel voice-help" role="dialog" aria-labelledby="voice-help-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h2 id="voice-help-title" className="hand-title">
            {title}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p>{intro}</p>
        {steps.length > 0 && (
          <ol className="voice-help__steps">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        )}
        <div className="voice-help__actions">
          {problem === 'no-service' && isAndroidNonChrome() && (
            <a className="btn btn--primary btn--big" href={chromeIntentUrl()}>
              Open this step in Chrome
            </a>
          )}
          <button className={`btn btn--big ${problem === 'no-service' && isAndroidNonChrome() ? 'btn--ghost' : 'btn--primary'}`} onClick={onRetry}>
            🎤 Try again
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            Not now
          </button>
        </div>
        <p className="voice-help__note">You can always use the big Next and Back buttons, or swipe.</p>
      </div>
    </div>
  );
}

function describe(problem: VoiceProblem, platform: Platform): { title: string; intro: string; steps: string[] } {
  switch (problem) {
    case 'stopped':
      return {
        title: 'Voice paused',
        intro: 'The phone stopped listening, which it sometimes does after a while. Tap Try again to keep going.',
        steps: [],
      };
    case 'denied':
      return {
        title: 'Allow the microphone',
        intro:
          'Tap Try again. If your phone asks to use the microphone, choose Allow. If it doesn’t ask, it has been told “no” before. Turn it back on like this, then tap Try again:',
        steps: ALLOW_MIC[platform],
      };
    case 'no-service':
      if (isAndroidNonChrome()) {
        return {
          title: 'Use Chrome for voice',
          intro:
            'Your microphone is allowed, but this browser (like Edge or Samsung Internet on Android) doesn’t include the speech recognition voice control needs. Chrome does. Tap below to open this same step in Chrome.',
          steps: [],
        };
      }
      if (isIphoneNonSafari()) {
        return {
          title: 'Use Safari for voice',
          intro:
            'On iPhone, voice control only works in Safari. Copy this page’s address, open it in Safari, then tap 🎤 there.',
          steps: [],
        };
      }
      return {
        title: 'Turn on dictation',
        intro: 'The phone’s speech recognition is switched off, so the site can’t understand what you say.',
        steps: TURN_ON_DICTATION[platform],
      };
    case 'no-mic':
      return {
        title: 'No microphone found',
        intro: 'This device didn’t give the site a microphone. If you have headphones with a mic plugged in, try unplugging them, then tap Try again.',
        steps: [],
      };
    default: {
      const _exhaustive: never = problem;
      return _exhaustive;
    }
  }
}
