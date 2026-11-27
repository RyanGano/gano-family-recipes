import type { VoiceStatus } from '../lib/voice';

export type VoiceProblem = Extract<VoiceStatus, 'denied' | 'no-service' | 'no-mic' | 'stopped'>;

export function isVoiceProblem(status: VoiceStatus): status is VoiceProblem {
  return status === 'denied' || status === 'no-service' || status === 'no-mic' || status === 'stopped';
}

/** Which browser the steps are written for. Menus differ even between Chromium browsers. */
type Browser = 'edge-android' | 'samsung' | 'chrome-android' | 'safari-ios' | 'other-ios' | 'desktop';

const ua = () => navigator.userAgent;

function detectBrowser(): Browser {
  const u = ua();
  // iPadOS reports itself as a Mac, so also check for a touch screen.
  if (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) {
    return /CriOS|EdgiOS|FxiOS|OPiOS/.test(u) ? 'other-ios' : 'safari-ios';
  }
  if (/Android/.test(u)) {
    if (/EdgA/.test(u)) return 'edge-android';
    if (/SamsungBrowser/.test(u)) return 'samsung';
    return 'chrome-android';
  }
  return 'desktop';
}

/** Android browsers where Chrome is the better bet for voice. */
const offersChrome = (b: Browser) => b === 'edge-android' || b === 'samsung';

/** Opens the current page and step in Chrome on Android. */
function chromeIntentUrl(): string {
  const { host, pathname, hash } = window.location;
  return `intent://${host}${pathname}?go=${encodeURIComponent(hash)}#Intent;scheme=https;package=com.android.chrome;end`;
}

const ALLOW_MIC: Record<Browser, string[]> = {
  'edge-android': [
    'Tap the ⋯ menu at the bottom of the screen, then Settings.',
    'Tap “Privacy, security and services” (on some versions “Privacy and security”), then “Site permissions”.',
    'Tap Microphone. Set it to ask first, and remove this site from the Blocked list if it’s there.',
    'If Edge itself isn’t allowed the mic: Android Settings app → Apps → Microsoft Edge → Permissions → Microphone → Allow.',
  ],
  samsung: [
    'Tap the ≡ menu at the bottom of the screen, then Settings.',
    'Tap “Sites and downloads” (or “Privacy”), then “Site permissions”.',
    'Tap Microphone and allow this site.',
    'If Samsung Internet itself isn’t allowed the mic: Settings app → Apps → Samsung Internet → Permissions → Microphone → Allow.',
  ],
  'chrome-android': [
    'Tap the icon just left of the web address.',
    'Tap “Permissions”.',
    'Turn Microphone on.',
    'If Chrome itself isn’t allowed the mic: Android Settings app → Apps → Chrome → Permissions → Microphone → Allow.',
  ],
  'safari-ios': [
    'Tap the “aA” (or page settings) button in the address bar.',
    'Tap “Website Settings”.',
    'Set Microphone to “Allow” (or “Ask”).',
    'If that isn’t there: open the Settings app → Apps → Safari → Microphone → “Ask” or “Allow”.',
  ],
  'other-ios': [
    'On iPhone, voice control only works in Safari.',
    'Copy this page’s address, open it in Safari, and tap 🎤 there.',
  ],
  desktop: ['Click the icon just left of the web address.', 'Set Microphone to “Allow” for this site.'],
};

const TURN_ON_DICTATION: Partial<Record<Browser, string[]>> = {
  'safari-ios': [
    'Open the Settings app → General → Keyboard.',
    'Turn on “Enable Dictation”.',
    'Also check Settings → Siri: voice recognition needs Siri & Dictation available.',
  ],
  'chrome-android': [
    'Open the Settings app → Apps → Google → Permissions → Microphone → Allow.',
    'Make sure “Speech Services by Google” is installed and up to date.',
  ],
};

/**
 * Shown when voice control can't start. Says why in plain words, how to fix
 * it on this kind of phone, and offers a "Try again" button (a fresh tap is
 * what lets the browser show its "Allow microphone?" prompt).
 */
export function VoiceHelp({ problem, onRetry, onClose }: { problem: VoiceProblem; onRetry: () => void; onClose: () => void }) {
  const browser = detectBrowser();
  const { title, intro, steps } = describe(problem, browser);
  const chromeFirst = problem === 'no-service' && offersChrome(browser);
  const showChrome = (problem === 'no-service' || problem === 'denied') && offersChrome(browser);
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
          {showChrome && chromeFirst && (
            <a className="btn btn--primary btn--big" href={chromeIntentUrl()}>
              Open this step in Chrome
            </a>
          )}
          <button className={`btn btn--big ${chromeFirst ? 'btn--ghost' : 'btn--primary'}`} onClick={onRetry}>
            🎤 Try again
          </button>
          {showChrome && !chromeFirst && (
            <a className="btn btn--ghost" href={chromeIntentUrl()}>
              Or open this step in Chrome
            </a>
          )}
          <button className="btn btn--ghost" onClick={onClose}>
            Not now
          </button>
        </div>
        <p className="voice-help__note">You can always use the big Next and Back buttons, or swipe.</p>
      </div>
    </div>
  );
}

function describe(problem: VoiceProblem, browser: Browser): { title: string; intro: string; steps: string[] } {
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
          browser === 'other-ios'
            ? 'This browser can’t do voice control on iPhone.'
            : 'Tap Try again. If your phone asks to use the microphone, choose Allow. If it doesn’t ask, it has been told “no” before. Turn it back on like this, then tap Try again:',
        steps: ALLOW_MIC[browser],
      };
    case 'no-service':
      if (offersChrome(browser)) {
        return {
          title: 'Use Chrome for voice',
          intro: `Your microphone is allowed, but ${browser === 'edge-android' ? 'Edge' : 'Samsung Internet'} on Android doesn’t include the speech recognition voice control needs. Chrome does. Tap below to open this same step in Chrome.`,
          steps: [],
        };
      }
      if (browser === 'other-ios') {
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
        steps: TURN_ON_DICTATION[browser] ?? [],
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
