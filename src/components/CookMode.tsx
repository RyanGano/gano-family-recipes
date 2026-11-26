import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import type { Recipe, Step } from '../api/types';
import { formatTimerLength, scaleIngredient, scaleUse } from '../lib/format';
import { toggle, useChecked, useLastStep, useScale, useTextSize } from '../lib/prefs';
import { go, href } from '../lib/route';
import { playBlip } from '../lib/sound';
import { ingredientsSpeech, screenSpeech } from '../lib/speech';
import { parseBoolean, useStored } from '../lib/storage';
import { useTimers } from '../lib/timers';
import { useRecipe } from '../lib/useRecipes';
import { speak, speechSupported, stopSpeaking, useVoiceCommands, type VoiceCommand } from '../lib/voice';
import { Amount } from './Amount';
import { ScalePicker } from './ScalePicker';
import { TimerTray } from './TimerTray';
import { WakeToggle } from './WakeToggle';

/**
 * Full-screen, one-step-at-a-time cooking.
 *   screen 0          gather ingredients & equipment
 *   screens 1..N      the steps
 *   screen N+1        all done
 * Change steps with the big buttons, a swipe, arrow keys, or your voice.
 */
export function CookMode({ slug, step }: { slug: string; step: number }) {
  const recipe = useRecipe(slug);
  if (recipe.kind === 'loading') return <div className="cook" />;
  if (recipe.kind === 'missing') {
    go({ kind: 'box' }, { replace: true });
    return null;
  }
  return <CookView recipe={recipe.value} requested={step} />;
}

function CookView({ recipe, requested }: { recipe: Recipe; requested: number }) {
  const total = recipe.steps.length;
  const last = total + 1;
  const index = Math.min(Math.max(requested, 0), last);
  const step: Step | undefined = index >= 1 && index <= total ? recipe.steps[index - 1] : undefined;

  const [scale, setScale] = useScale(recipe.slug);
  const [checked, setChecked] = useChecked(recipe.slug);
  const [, setLastStep] = useLastStep(recipe.slug);
  const [textSize, setTextSize] = useTextSize();
  const [voiceOn, setVoiceOn] = useStored('voice.enabled', parseBoolean, false);
  const [readAloud, setReadAloud] = useStored('readAloud.enabled', parseBoolean, false);
  const [speaking, setSpeaking] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [toast, setToast] = useState('');
  const timers = useTimers();

  const goTo = useCallback(
    (n: number) => go({ kind: 'cook', slug: recipe.slug, step: Math.min(Math.max(n, 0), last) }, { replace: true }),
    [recipe.slug, last],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const back = useCallback(() => goTo(index - 1), [goTo, index]);

  // Remember where we are so the recipe card can offer "pick up at step N".
  useEffect(() => {
    setLastStep(index > total ? 0 : index);
  }, [index, total, setLastStep]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? '' : t)), 2200);
  }, []);

  const say = useCallback(
    (text: string) => speak(text, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) }),
    [],
  );

  // Read each new screen aloud when "read aloud" is on.
  useEffect(() => {
    if (readAloud) say(screenSpeech(recipe, index, scale));
    return () => stopSpeaking();
  }, [index, readAloud]);

  const startStepTimer = useCallback(() => {
    const timer = step?.timers?.[0];
    if (!timer) {
      flash('No timer on this step');
      return;
    }
    const running = timers.timers.some((t) => t.recipeSlug === recipe.slug && t.step === index && t.label === timer.label);
    if (running) {
      flash(`${timer.label} timer is already going`);
      return;
    }
    timers.start({ timer, recipeSlug: recipe.slug, step: index });
    flash(`Started ${formatTimerLength(timer)} timer`);
  }, [step, timers, recipe.slug, index, flash]);

  const onVoice = useCallback(
    (cmd: VoiceCommand, heard: string) => {
      playBlip();
      switch (cmd) {
        case 'next':
          flash(`“${heard}” → next`);
          next();
          break;
        case 'back':
          flash(`“${heard}” → back`);
          back();
          break;
        case 'repeat':
          say(screenSpeech(recipe, index, scale));
          break;
        case 'ingredients':
          say(ingredientsSpeech(recipe, index, scale));
          break;
        case 'timer':
          startStepTimer();
          break;
        case 'stop':
          stopSpeaking();
          timers.dismissRinging();
          flash('Stopped');
          break;
        default: {
          const _exhaustive: never = cmd;
          return _exhaustive;
        }
      }
    },
    [next, back, say, recipe, index, scale, startStepTimer, timers, flash],
  );

  const voice = useVoiceCommands({ enabled: voiceOn, paused: speaking, onCommand: onVoice });

  useEffect(() => {
    if (voice.status === 'blocked') {
      setVoiceOn(false);
      flash('Microphone is blocked. Allow it in your browser settings to use voice.');
    }
  }, [voice.status, setVoiceOn, flash]);

  // Keyboard: → / space / enter = next, ← = back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        back();
      } else if (e.key === 'Escape') {
        go({ kind: 'recipe', slug: recipe.slug });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, recipe.slug]);

  // Swipe left/right anywhere on the step.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else back();
    }
  };

  // Scroll each new step to the top.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
  }, [index]);

  const nextStep = index < total ? recipe.steps[index] : undefined;
  const nextLabel = index === 0 ? 'Start step 1' : index === total ? 'Finish' : index > total ? 'Done' : 'Next';

  const toggleVoice = () => {
    if (!voiceOn) flash('Listening. Say “next”, “back”, “repeat”, “start timer” or “stop”.');
    setVoiceOn(!voiceOn);
  };
  const toggleReadAloud = () => {
    if (readAloud) stopSpeaking();
    else say(screenSpeech(recipe, index, scale));
    setReadAloud(!readAloud);
  };

  return (
    <div className={`cook cook--size-${textSize}`}>
      <header className="cook-top">
        <a className="icon-btn icon-btn--light" href={href({ kind: 'recipe', slug: recipe.slug })} aria-label="Close cook mode">
          ✕
        </a>
        <button className="cook-top__title" onClick={() => setShowSteps(true)} aria-label="Show all steps">
          <span className="cook-top__name">{recipe.title}</span>
          <span className="cook-top__count">
            {index === 0 ? 'Get ready' : index > total ? 'Done!' : `Step ${index} of ${total}`} ▾
          </span>
        </button>
        <div className="cook-top__tools">
          {voice.status !== 'unsupported' && (
            <button
              className={`icon-btn icon-btn--light ${voiceOn ? 'is-on' : ''}`}
              onClick={toggleVoice}
              aria-pressed={voiceOn}
              aria-label="Voice control"
              title="Voice control"
            >
              🎤
            </button>
          )}
          {speechSupported() && (
            <button
              className={`icon-btn icon-btn--light ${readAloud ? 'is-on' : ''}`}
              onClick={toggleReadAloud}
              aria-pressed={readAloud}
              aria-label="Read steps aloud"
              title="Read steps aloud"
            >
              🔊
            </button>
          )}
          <button
            className="icon-btn icon-btn--light"
            onClick={() => setTextSize((textSize + 1) % 3)}
            aria-label="Change text size"
            title="Text size"
          >
            Aa
          </button>
        </div>
      </header>

      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(index, total)}>
        {recipe.steps.map((s, i) => (
          <button
            key={s.id}
            className={`progress__seg ${i + 1 < index ? 'done' : ''} ${i + 1 === index ? 'current' : ''}`}
            onClick={() => goTo(i + 1)}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
          />
        ))}
      </div>

      {voiceOn && voice.status === 'listening' && (
        <div className="listening">
          <span className="listening__dot" /> {speaking ? 'Reading…' : voice.lastHeard ? `Heard “${voice.lastHeard}”` : 'Listening…'}
        </div>
      )}

      <div className="cook-body" ref={bodyRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="cook-card">
          {index === 0 && <GatherScreen recipe={recipe} scale={scale} setScale={setScale} checked={checked} setChecked={setChecked} />}
          {step && (
            <StepScreen
              recipe={recipe}
              step={step}
              index={index}
              scale={scale}
              checked={checked}
              setChecked={setChecked}
              onStartTimer={startStepTimer}
            />
          )}
          {index > total && (
            <FinishScreen
              recipe={recipe}
              onRestart={() => {
                setChecked([]);
                goTo(0);
              }}
            />
          )}
        </div>
      </div>

      <TimerTray placement="docked" currentStep={index} />

      <nav className="cook-nav">
        <button className="btn cook-nav__back" onClick={back} disabled={index === 0} aria-label="Previous step">
          ‹ Back
        </button>
        {index <= total ? (
          <button className="btn btn--primary cook-nav__next" onClick={next}>
            <span>{nextLabel} ›</span>
            {nextStep && index > 0 && <small>{nextStep.title}</small>}
          </button>
        ) : (
          <a className="btn btn--primary cook-nav__next" href={href({ kind: 'recipe', slug: recipe.slug })}>
            <span>Back to the card</span>
          </a>
        )}
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}

      {showSteps && (
        <div className="sheet" onClick={() => setShowSteps(false)}>
          <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__head">
              <h2 className="hand-title">All steps</h2>
              <button className="icon-btn" onClick={() => setShowSteps(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <ol className="step-list">
              <li>
                <button className={index === 0 ? 'is-current' : ''} onClick={() => { goTo(0); setShowSteps(false); }}>
                  <span className="step-list__num">·</span> Gather ingredients
                </button>
              </li>
              {recipe.steps.map((s, i) => (
                <li key={s.id}>
                  <button className={index === i + 1 ? 'is-current' : ''} onClick={() => { goTo(i + 1); setShowSteps(false); }}>
                    <span className="step-list__num">{i + 1}</span>
                    <span>
                      {s.title}
                      <small>{s.section}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="sheet__foot">
              <WakeToggle />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CheckProps {
  checked: string[];
  setChecked: (next: string[]) => void;
}

function GatherScreen({ recipe, scale, setScale, checked, setChecked }: { recipe: Recipe; scale: number; setScale: (s: number) => void } & CheckProps) {
  const gathered = recipe.ingredients.filter((i) => checked.includes(`ing:${i.id}`)).length;
  return (
    <>
      <p className="cook-section">Before you start</p>
      <h1 className="cook-title">Gather everything</h1>
      <ScalePicker recipe={recipe} scale={scale} onChange={setScale} />
      <p className="cook-hint">
        Tap each one as you set it out · {gathered} of {recipe.ingredients.length}
      </p>
      {recipe.sections.map((section) => {
        const items = recipe.ingredients.filter((i) => i.section === section);
        if (!items.length) return null;
        return (
          <div key={section}>
            {recipe.sections.length > 1 && <h2 className="cook-sub">{section}</h2>}
            <ul className="cook-ingredients">
              {items.map((ing) => {
                const id = `ing:${ing.id}`;
                const done = checked.includes(id);
                return (
                  <li key={ing.id}>
                    <button className={`check-row check-row--big ${done ? 'is-done' : ''}`} onClick={() => setChecked(toggle(checked, id))} aria-pressed={done}>
                      <span className="box" aria-hidden>{done ? '✓' : ''}</span>
                      <span>
                        <Amount line={scaleIngredient(ing, { scale })} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {recipe.equipment?.length ? (
        <>
          <h2 className="cook-sub">Equipment</h2>
          <ul className="plain-list cook-equipment">
            {recipe.equipment.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="cook-howto">
        <strong>How to move between steps</strong>
        <span>Tap Next / Back, swipe left or right, or turn on 🎤 and say “next”.</span>
      </div>
    </>
  );
}

function StepScreen({
  recipe,
  step,
  index,
  scale,
  checked,
  setChecked,
  onStartTimer,
}: {
  recipe: Recipe;
  step: Step;
  index: number;
  scale: number;
  onStartTimer: () => void;
} & CheckProps) {
  const { timers } = useTimers();
  return (
    <>
      <p className="cook-section">
        {step.section}
        {step.whileWaiting && <span className="badge badge--soft">while you wait</span>}
      </p>
      <h1 className="cook-title">
        <span className="cook-title__num">{index}</span>
        {step.title}
      </h1>

      {step.temperature && (
        <div className="temp">
          <span aria-hidden>🔥</span> {step.temperature.label ?? 'Oven'} {step.temperature.degrees}°{step.temperature.unit}
        </div>
      )}

      {step.uses?.length ? (
        <ul className="cook-ingredients">
          {step.uses.map((u) => {
            const id = `add:${step.id}:${u.ref}`;
            const done = checked.includes(id);
            return (
              <li key={u.ref}>
                <button className={`check-row check-row--big ${done ? 'is-done' : ''}`} onClick={() => setChecked(toggle(checked, id))} aria-pressed={done}>
                  <span className="box" aria-hidden>{done ? '✓' : ''}</span>
                  <span>
                    <Amount line={scaleUse(recipe, u, scale)} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="cook-text">{step.text}</p>

      {step.checklist?.length ? (
        <ol className="cook-checklist">
          {step.checklist.map((c, i) => {
            const id = `chk:${step.id}:${i}`;
            const done = checked.includes(id);
            return (
              <li key={id}>
                <button className={`check-row check-row--big ${done ? 'is-done' : ''}`} onClick={() => setChecked(toggle(checked, id))} aria-pressed={done}>
                  <span className="box box--num" aria-hidden>{done ? '✓' : i + 1}</span>
                  <span>{c.use ? <Amount line={scaleUse(recipe, c.use, scale)} /> : c.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}

      {step.timers?.map((t) => {
        const active = timers.find((a) => a.recipeSlug === recipe.slug && a.step === index && a.label === t.label);
        return (
          <div key={t.label} className="step-timer">
            {active ? (
              <p className="step-timer__running">
                ⏱ {t.label} timer is {active.phase.kind === 'paused' ? 'paused' : active.phase.kind === 'ringing' ? 'done' : 'running'} (see the bar below)
              </p>
            ) : (
              <button className="btn btn--timer btn--big" onClick={onStartTimer}>
                <span>⏱ Start {formatTimerLength(t)} timer</span>
                {t.maxSeconds ? <small>Chimes at {formatTimerLength({ seconds: t.seconds })} to check, rings at {formatTimerLength({ seconds: t.maxSeconds })}</small> : null}
              </button>
            )}
            {t.doneWhen && <p className="step-timer__done">Done when: {t.doneWhen}</p>}
          </div>
        );
      })}

      {step.tip && (
        <aside className="tip">
          <span className="tip__label">Tip</span> {step.tip}
        </aside>
      )}
    </>
  );
}

function FinishScreen({ recipe, onRestart }: { recipe: Recipe; onRestart: () => void }) {
  return (
    <div className="finish">
      <p className="cook-section">All done</p>
      <h1 className="cook-title">Enjoy your {recipe.title}!</h1>
      <p className="finish__heart" aria-hidden>
        ♥
      </p>
      {recipe.notes?.length ? (
        <ul className="plain-list">
          {recipe.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      <button className="btn btn--ghost" onClick={onRestart}>
        Start over
      </button>
    </div>
  );
}
