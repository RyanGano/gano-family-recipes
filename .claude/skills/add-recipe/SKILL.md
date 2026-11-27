---
name: add-recipe
description: Add a family recipe to the Gano recipe box site from a photo or pasted text. Clarifies gaps with the user, designs the step-by-step cook-mode breakdown (timers, checklists, temperatures), proposes it for approval, then adds the recipe and any new cook-mode features. Use when the user says "add a recipe", shares a recipe card photo, or pastes a recipe to put on the site.
---

# Add a recipe

You are turning a family recipe into a cook-mode recipe for this site. In cook mode each step fills a phone screen with its ingredient amounts, so the work is mostly breaking the recipe into good steps. Run the stages in order. Stage 4 ends on the user's approval, and nothing gets written before that. After that approval, build and ship through to the live site without asking again.

The data model is [`src/api/types.ts`](../../../src/api/types.ts). Read it before stage 3. Its comments say what each field does. [`src/api/recipes/breakfast-puffs.ts`](../../../src/api/recipes/breakfast-puffs.ts) is the worked example. It shows split sections, an ordered checklist with a liquid added in thirds, a range timer, and coating steps done while the puffs bake.

## 1. Transcribe

- **Photo**: read the image. Transcribe it word for word, including margin notes, crossed-out amounts and who wrote it. Mark anything you can't read as `[illegible: best guess]`; never silently guess.
- **Text**: take it as given.

Keep this transcript. It is the source of truth for the classic recipe card, and later stages refer back to it.

**Done when** every line of the source appears in the transcript or is marked illegible.

## 2. Clarify

List every gap. Then ask about them with `AskUserQuestion` (up to 4 questions per call, and as many calls as you need). Give each question options that carry your best guess, so the user can just tap. Look for:

- Amounts with no number ("some milk", "a can of soup": what size?) and abbreviations that could mean two things ("T" vs "t").
- Oven temperature, pan size, bake or cook times and doneness cues the card leaves out.
- Yield, meaning what one batch makes. The ½×/2× scaler multiplies it.
- Who the recipe is from, a line of family story if there is one, and a category (the `Category` union in `types.ts`).
- Anything illegible from stage 1.

A gap the user can't fill stays out of the recipe or becomes a `tip` worded as a suggestion ("Most versions bake about 30 min; check at 25"). Never present invented facts as the family's recipe.

**Done when** every gap on your list has an answer, or the user has said to leave it out.

## 3. Design the cook-mode breakdown

Walk the instructions one sentence at a time and decide the cook-mode screens. For each sentence, check it against the **feature catalog** below and use every feature that fits:

| Signal in the recipe | Feature | Field |
|---|---|---|
| A duration: "mix 30 seconds", "simmer 10 min", "chill 1 hour" | Tap-to-start timer that keeps running across steps | `timers` |
| A range: "20–25 minutes" | Range timer: chimes "check now" at the low end, rings at the high end | `timers[].maxSeconds` |
| A doneness cue: "until golden", "until a toothpick comes out clean" | Shown with the timer and in the "time's up" alert | `timers[].doneWhen` |
| Oven or stove heat | Temperature badge | `temperature` |
| Additions in a set order, or alternating ("flour, some milk, …") | Numbered tap-off checklist with per-item amounts | `checklist` (with `use.fraction` and `use.label`) |
| Ingredients used in this step | Amounts on screen, scaled, tap to check off | `uses` |
| Work that fits inside a wait ("meanwhile", or a coating made while it bakes) | Reorder it to sit after the timer step, with a "while you wait" badge | `whileWaiting` |
| A hint, warning or family trick | Tip box | `tip` |
| Equipment worth setting out first | Shown on the "gather" screen | `equipment` |
| Hands-off time measured in hours (rising, chilling, marinating) | Added to the recipe box time ("60 min + 2½ hrs of rising") and a badge on the card | `waitTime` |
| Anything unusual a cook should know before choosing this recipe ("Needs a candy thermometer"). Not the night before, which stamps itself | Rubber stamp on the recipe box card | `stamps` |
| An ingredient most kitchens don't keep on hand (orange juice, almond flavoring, buttermilk) | Listed under "What you might need to buy" on the box card and recipe page. Use a string to name the real purchase ("Fresh oranges (for the grated rind)") | `Ingredient.buy` |
| "The day/night before", or prep that must sit overnight | "Night before" badge on the step, plus a warning on the card and gather screen. Use `'recommended'` when the recipe works without it | `nightBefore` |

Shape the steps like this:

- One action per screen, with a short title ("Mix the wet ingredients"). Split a sentence that hides two actions, such as heating the oven and greasing the pan.
- Put the step that uses an ingredient on the screen where it goes in, with the exact (scaled) amount. When an ingredient goes in over several steps, use `fraction` on each use.
- Before a long wait, move the parallel prep into the wait.

Then look for a **new feature**: a signal in this recipe that no catalog row covers and that would help someone cooking from a phone. Examples are a rise or rest stage measured in hours, a "repeat for each layer" loop, a candy-thermometer target, or a step that needs a photo. Sketch each candidate as a data field plus what it looks like in cook mode. Only propose one if this recipe actually uses it.

**Done when** every sentence of the transcript maps to a screen, every ingredient is used on at least one screen, and every catalog signal in the recipe has its feature.

## 4. Propose, and wait for approval

Show the user:

1. A table of the screens: number, section, title, ingredients with amounts, and features (timer, checklist, temperature, while-you-wait, tip).
2. Any reordering compared with the original card, and why.
3. Any new features, each as one line on what it does and one line on how it looks on the phone.
4. The metadata: title, slug, from, category, yield, and prep and cook minutes.

Then ask with `AskUserQuestion`: approve, or change something. Loop on their changes.

**Done when** the user has approved the breakdown and each new feature.

## 5. Build

1. **New features first**, if any were approved. Add the field to `src/api/types.ts` with a doc comment. Render it in `src/components/CookMode.tsx` (`StepScreen`), on the recipe card if it belongs there, and in `screenSpeech` in `src/lib/speech.ts` so read-aloud covers it. Add a catalog row to stage 3 of this skill, so the next recipe can use it.
2. **The recipe**: create `src/api/recipes/<slug>.ts`, exporting a `Recipe`, and add it to `allRecipes` in `src/api/recipes/index.ts`.
   - Store amounts as numbers (`0.5`, `1 / 3`) and use singular units (`cup`, `teaspoon`). The UI handles fractions and plurals. Set `singular` on countable items ("egg").
   - The `text` of each step is the original instruction, made complete. The cook-mode `title` and `tip` are your additions.
   - Photos go in `public/photos/` and are listed in `photos` as `{ src: 'photos/<slug>-<what>.jpg', caption }`. The card shows each one with its caption. Ask before saving the source card photos: the user may want only a photo of the finished dish.
3. **Verify**:
   - `npm test`. The recipe checks catch bad ingredient references, unused ingredients, bad sections and bad timers.
   - `npm run build`.
   - Start the dev server (`.claude/launch.json` → `recipes-dev`) and open `/gano-family-recipes/#/recipe/<slug>` at the mobile viewport. Step through every cook-mode screen, start one timer, and check that amounts look right at ½× and 2×.
4. **Ship**: commit on a branch, push, and open a PR. Then merge it yourself (`gh pr merge --squash --delete-branch`). The user approved the breakdown in stage 4, and merging to `main` deploys the site to GitHub Pages through `.github/workflows/deploy.yml`. Don't merge if you have a serious concern about the recipe: something on it may be unsafe (an undercooked meat, a canning shortcut), an amount looks wrong for what it makes, or a check failed. In that case leave the PR open and tell the user why.
5. **Confirm the deploy**: watch the Pages run for the merge commit (`gh run watch`) and report the live URL, `https://ryangano.github.io/gano-family-recipes/#/recipe/<slug>`.

**Done when** tests and the build pass, every cook-mode screen of the new recipe has been viewed on the phone viewport, and the PR is merged and deployed, or left open with the concern explained to the user.
