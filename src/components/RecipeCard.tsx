import { useEffect } from 'react';
import type { Recipe } from '../api/types';
import { formatTimerLength, scaleIngredient } from '../lib/format';
import { toggle, useChecked, useLastStep, useScale } from '../lib/prefs';
import { href } from '../lib/route';
import { useRecipe } from '../lib/useRecipes';
import { Amount } from './Amount';
import { ScalePicker } from './ScalePicker';
import { WakeToggle } from './WakeToggle';

/** The classic recipe card: ingredients and directions on lined paper. */
export function RecipeCard({ slug }: { slug: string }) {
  const recipe = useRecipe(slug);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (recipe.kind === 'loading') return <div className="card-page" />;
  if (recipe.kind === 'missing') {
    return (
      <div className="card-page">
        <article className="index-card index-card--full">
          <h1 className="hand-title">Card not found</h1>
          <p>
            That recipe isn't in the box. <a href={href({ kind: 'box' })}>Back to the recipe box</a>
          </p>
        </article>
      </div>
    );
  }
  return <RecipeCardView recipe={recipe.value} />;
}

function RecipeCardView({ recipe }: { recipe: Recipe }) {
  const [scale, setScale] = useScale(recipe.slug);
  const [checked, setChecked] = useChecked(recipe.slug);
  const [lastStep] = useLastStep(recipe.slug);
  const stepCount = recipe.steps.length;
  const canResume = lastStep > 0 && lastStep <= stepCount;

  return (
    <div className="card-page">
      <nav className="topbar">
        <a className="pill" href={href({ kind: 'box' })}>
          ← Recipe box
        </a>
        <WakeToggle compact />
      </nav>

      <article className="index-card index-card--full">
        <header className="card-head">
          <span className="index-card__category">{recipe.category}</span>
          <h1 className="hand-title">{recipe.title}</h1>
          {recipe.from && <p className="from-line">From the kitchen of <span className="hand">{recipe.from}</span></p>}
          {recipe.story && <p className="story">{recipe.story}</p>}
          <div className="badges">
            {recipe.prepMinutes ? <span className="badge">Prep {recipe.prepMinutes} min</span> : null}
            {recipe.cookMinutes ? <span className="badge">Cook {recipe.cookMinutes} min</span> : null}
            <span className="badge">{stepCount} steps</span>
          </div>
        </header>

        <div className="cook-cta">
          <a className="btn btn--primary btn--big" href={href({ kind: 'cook', slug: recipe.slug, step: 0 })}>
            Start cooking · step by step
          </a>
          {canResume && (
            <a className="btn btn--ghost" href={href({ kind: 'cook', slug: recipe.slug, step: lastStep })}>
              Pick up at step {lastStep}
            </a>
          )}
        </div>

        <ScalePicker recipe={recipe} scale={scale} onChange={setScale} />

        <section>
          <h2 className="card-section">Ingredients</h2>
          {recipe.sections.map((section) => {
            const items = recipe.ingredients.filter((i) => i.section === section);
            if (!items.length) return null;
            return (
              <div key={section}>
                {recipe.sections.length > 1 && <h3 className="card-subsection">{section}</h3>}
                <ul className="ingredients">
                  {items.map((ing) => {
                    const id = `ing:${ing.id}`;
                    const done = checked.includes(id);
                    return (
                      <li key={ing.id}>
                        <button className={`check-row ${done ? 'is-done' : ''}`} onClick={() => setChecked(toggle(checked, id))} aria-pressed={done}>
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
          {checked.length > 0 && (
            <button className="link-btn" onClick={() => setChecked([])}>
              Clear checkmarks
            </button>
          )}
        </section>

        {recipe.equipment?.length ? (
          <section>
            <h2 className="card-section">You'll need</h2>
            <ul className="plain-list">
              {recipe.equipment.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="card-section">Directions</h2>
          {recipe.sections.map((section) => {
            const steps = recipe.steps.filter((s) => s.section === section);
            if (!steps.length) return null;
            return (
              <div key={section}>
                {recipe.sections.length > 1 && <h3 className="card-subsection">{section}</h3>}
                <ol className="directions">
                  {steps.map((s) => {
                    const stepNumber = recipe.steps.indexOf(s) + 1;
                    return (
                      <li key={s.id} value={stepNumber}>
                        <a className="direction" href={href({ kind: 'cook', slug: recipe.slug, step: stepNumber })}>
                          {s.text}
                          {s.timers?.map((t) => (
                            <span key={t.label} className="badge badge--timer">⏱ {formatTimerLength(t)}</span>
                          ))}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>

        {recipe.notes?.length ? (
          <section>
            <h2 className="card-section">Notes</h2>
            <ul className="plain-list">
              {recipe.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {recipe.photo && (
          <section>
            <h2 className="card-section">The original card</h2>
            <img className="original-photo" src={`${import.meta.env.BASE_URL}${recipe.photo}`} alt={`Original recipe card for ${recipe.title}`} loading="lazy" />
          </section>
        )}
      </article>
    </div>
  );
}
