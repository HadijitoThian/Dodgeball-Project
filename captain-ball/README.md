# Captain Ball

A 2.5D isometric captain ball game for the browser. Phaser 3 + TypeScript + Vite.

> **Status: Step 1 of 6 — skeleton.** The court, both teams and the ball are on
> screen and correctly depth-sorted. Nothing moves yet. Movement lands in Step 2.

---

## Running it

You need **Node 20 or newer**. Check with `node --version`.

Open PowerShell in this folder (`captain-ball`, **not** the repo root) and run
these one line at a time:

```powershell
cd captain-ball
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

`npm install` only needs running the first time, or after `package.json` changes.

### What you should see

1. A dark title screen reading **CAPTAIN BALL** with a big blue **PLAY** button.
2. Click or tap PLAY (or press Enter/Space).
3. An isometric wooden court with:
   - **14 players** — 7 blue, 7 red — spread out in their starting formation, none
     of them overlapping,
   - **two crowned captains** (shirt number 1) standing on grey stools inside
     coloured restricted circles, at **opposite** ends,
   - the **ball on the centre spot**,
   - a **yellow ring** under one blue attacker — that will be the player you
     control from Step 2,
   - a score bar across the top reading **BLUE 0 – 0 RED**.

Every player casts a shadow, and players lower on the screen draw in front of
players behind them. That is the depth sorting working.

### Checking the sport is modelled the right way round

Each team's captain stands at the **opponent's** end. So the blue captain is down
at the far end from the blue defenders. That is correct, and it is the thing
most likely to look wrong at first glance.

---

## All the commands

Run these one line at a time in PowerShell.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server at http://localhost:5173. Edits appear instantly. |
| `npm run build` | Type-check, then build the production site into `dist/`. |
| `npm run preview` | Serve the built `dist/` folder locally, exactly as Vercel will. |
| `npm run typecheck` | Type-check only. Fast. |
| `npm test` | Run the unit tests once. |
| `npm run test:watch` | Re-run tests as you edit. |

None of these delete anything outside `dist/`, which is rebuilt from scratch
every time and is not committed to git.

---

## Testing

Vitest covers the two things that are pure maths and easy to get silently wrong:

- **`tests/projection.test.ts`** — the isometric conversion. Chiefly that
  `screenToIso(isoToScreen(p))` returns exactly `p`, that height lifts a sprite up
  the screen, and that depth sorting orders players correctly.
- **`tests/rules.test.ts`** — the rulebook geometry. Team composition, that each
  captain is at the **opponent's** end, that nobody starts inside a restricted
  circle, and that no two players spawn on top of each other.

Rendering is deliberately not tested.

```powershell
npm test
```

---

## Deploying to Vercel

The whole game is static files — no server, no database, no login.

1. Push this repo to GitHub.
2. In Vercel, **New Project** → import the repo.
3. **Important:** set **Root Directory** to `captain-ball`. This repo also holds
   an unrelated project at the top level, so Vercel needs pointing at this folder.
4. Leave the rest as detected — `vercel.json` already sets the framework, build
   command and output directory.
5. Deploy. Every push to `main` redeploys automatically.

To test the exact thing Vercel will serve, before you push:

```powershell
npm run build
npm run preview
```

---

## Controls

Nothing is wired up yet — this is the plan, delivered in Steps 2 and 3.

**Desktop**

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Space | Pass |
| Shift | Sprint |
| Tab | Switch to the player nearest the ball |
| Esc | Pause |

**Touch**

- Left half of the screen: virtual joystick (drag anywhere to move).
- Right side: a large **PASS** button and a smaller **SWITCH** button.
- Pause icon top-right.

Aim follows the direction you are moving. Gamepad support is a nice-to-have.

---

## Where things live

| Path | What it is |
| --- | --- |
| `src/config/rules.ts` | **The rulebook.** Court size, team size, the 7-second rule, fouls, match length. Change a number here and the whole game follows. |
| `src/config/balance.ts` | **The feel.** Run speeds, pass speed, AI difficulty presets. |
| `src/iso/projection.ts` | The only file that knows court metres become screen pixels. |
| `src/iso/court.ts` | Draws the floor, lines, circles and the two captain platforms. |
| `src/entities/` | `Player`, `Captain`, `Ball`. |
| `src/scenes/` | `BootScene` (assets), `MenuScene`, `MatchScene`, `HUDScene`. |
| `src/util/Storage.ts` | The whole persistence layer: a safe wrapper around `localStorage`. |
| `CLAUDE.md` | The full brief and the log of decisions made. Read it first. |

### Swapping in real artwork later

Nothing references an image filename. Every image has a **key** in `TEXTURES`
(`src/scenes/BootScene.ts`), and anything without a real file gets a placeholder
drawn in code. To use real art: drop the file in `public/sprites/` and add one
line to `ASSET_MANIFEST`. No other code changes.

---

## Known limitations at Step 1

- Nothing moves. No input, no passing, no rules enforcement, no AI, no clock.
- The score bar is static, and there is no match clock yet — it arrives in Step 4.
- Placeholder art only: players are coloured diamonds, the ball is a circle.
- The production bundle is ~338 KB gzipped, almost all of it Phaser itself. If
  that becomes a problem on mobile data, a custom Phaser build can trim it.
