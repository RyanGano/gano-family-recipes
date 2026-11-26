# Gano Family Recipe Box

Family recipes, made easy to cook from a phone.

**Live site:** https://ryangano.github.io/ganoe-family-recipes/

## What it does

- **Recipe box**: index cards in a wooden box, with category tabs and search by name or ingredient.
- **Recipe card**: the classic ingredients and directions. It has a ½× / 1× / 2× / 3× batch scaler and checkboxes you can tick as you go.
- **Cook mode**: one big step per screen, with that step's ingredient amounts.
  - **Changing steps**: tap the big Next / Back buttons, swipe, use the arrow keys, tap the progress bar, or use the step list.
  - **Voice control (🎤)**: say "next", "back", "repeat", "ingredients", "start timer" or "stop".
  - **Read aloud (🔊)**: reads each step out as you reach it.
  - **Timers**: start one from a step. Timers keep running as you move between steps and survive a page reload. A range like "20–25 min" chimes at 20 to check and rings at 25. The "time's up" alert lets you add 1 or 5 more minutes.
  - **Checklists**: you can tap off things that must be added in order, such as the milk added in thirds.
  - **"While you wait"**: steps marked this way, like making the coating, are done while something bakes.
  - **Pick up where you left off**: the site remembers which step you were on.
  - **Text size (Aa)**: switches between three sizes.
- **Screen stays on**: the site keeps the phone screen awake whenever it is open. Use the ☀︎ toggle to turn this off.

## Adding a recipe

In Claude Code, run `/add-recipe` (or just say "add a recipe") and give it a photo or the text. It asks about anything unclear, proposes the step-by-step breakdown and any new cook-mode features, and adds the recipe after you approve.

The recipes live in `src/api/recipes/`. Everything else gets them through `src/api/index.ts`, so swapping in a real database later means changing only that file.

## Development

```
npm install
npm run dev      # http://localhost:5173/ganoe-family-recipes/
npm test         # recipe consistency checks + unit tests
npm run build
```

Every push to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.
