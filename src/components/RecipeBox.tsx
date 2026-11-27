import { useEffect, useMemo, useState } from 'react';
import type { Recipe } from '../api/types';
import { formatUnit, recipeStamps, timeLine } from '../lib/format';
import { href } from '../lib/route';
import { useRecipeList } from '../lib/useRecipes';
import { BuyLink } from './BuyList';
import { Stamps } from './Stamps';
import { WakeToggle } from './WakeToggle';

const ALL = 'All';

/** The home page: a wooden recipe box with divider tabs and index cards. */
export function RecipeBox() {
  const list = useRecipeList();
  const [tab, setTab] = useState<string>(ALL);
  const [query, setQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const recipes = list.kind === 'ready' ? list.value : [];
  const categories = useMemo(() => [ALL, ...new Set(recipes.map((r) => r.category))], [recipes]);
  const shown = recipes.filter((r) => (tab === ALL || r.category === tab) && matches(r, query));

  return (
    <div className="box-page">
      <header className="box-lid">
        <div className="box-lid__plate">
          <p className="box-lid__small">The</p>
          <h1 className="box-lid__title">Gano Family</h1>
          <p className="box-lid__sub">Recipe Box</p>
        </div>
        <WakeToggle />
      </header>

      <div className="box-search">
        <input
          type="search"
          placeholder="Search recipes or ingredients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search recipes"
        />
      </div>

      <nav className="dividers" aria-label="Categories">
        {categories.map((c) => (
          <button
            key={c}
            className={`divider-tab ${tab === c ? 'is-active' : ''}`}
            onClick={() => setTab(c)}
            aria-pressed={tab === c}
          >
            {c}
          </button>
        ))}
      </nav>

      <main className="box-inside">
        {list.kind === 'loading' && <p className="box-empty">Opening the box…</p>}
        {list.kind === 'ready' && shown.length === 0 && <p className="box-empty">No cards match that search.</p>}
        <ul className="card-stack">
          {shown.map((r) => {
            const stamps = recipeStamps(r);
            const time = timeLine(r);
            const buys = r.ingredients.some((i) => i.buy);
            return (
              <li key={r.slug} className="card-stack__item">
                <a
                  className={`index-card index-card--link ${stamps.length ? 'has-stamps' : ''} ${buys ? 'has-buy' : ''}`}
                  href={href({ kind: 'recipe', slug: r.slug })}
                >
                  <Stamps stamps={stamps} />
                  <span className="index-card__category">{r.category}</span>
                  <span className="index-card__title">{r.title}</span>
                  <span className="index-card__meta">
                    Makes {r.yield.amount} {formatUnit(r.yield.unit, r.yield.amount)}
                    {time ? ` · ${time}` : ''}
                    {r.from ? ` · from ${r.from}` : ''}
                  </span>
                </a>
                <BuyLink recipe={r} className="buy-link--on-card" />
              </li>
            );
          })}
        </ul>
      </main>
      <footer className="box-footer">Collected over the years, one card at a time.</footer>
    </div>
  );
}

function matches(r: Recipe, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [r.title, r.category, r.from ?? '', ...(r.tags ?? []), ...r.ingredients.map((i) => i.name)]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}
