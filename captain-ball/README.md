# Captain Ball

A 2.5D isometric captain ball game for the browser. Phaser 3 + TypeScript + Vite.

> **Status: Step 2 of 6 — movement.** You can run a player around the court with
> the keyboard or a touch joystick, and switch to the player nearest the ball.
> Passing lands in Step 3.

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
3. An isometric wooden court with 14 players, two crowned captains on stools
   inside coloured restricted circles at **opposite** ends, and the ball on the
   centre spot.
4. A **yellow ring** under one blue player — that is the one you control.

Now try it:

- **Hold W.** Your player runs towards the top of the screen. Because the court
  is tilted, that is a diagonal across the floor — which is exactly right.
- **Hold Shift while running.** You speed up, and the SPRINT meter in the bottom
  left drains. Let go and it refills.
- **Run at a captain's circle.** You cannot get in. You slide around the edge
  instead of stopping dead.
- **Run at a touchline.** You stop at the line rather than leaving the court.
- **Press Tab.** Control jumps to the player nearest the ball. Press it again and
  it moves on to the next nearest.
- **Watch the depth sorting.** Run behind another player, then in front of them.
  Whoever is lower on the screen draws in front.

On a phone or tablet, put a thumb **anywhere on the left half** — the joystick
appears under it. Drag to run, drag further out to sprint. The **SWITCH** button
is bottom right.

**Only your player moves.** The other thirteen stand still until the AI is
written in Step 5. That is expected, not a bug.

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

**Desktop**

| Key | Action | Working? |
| --- | --- | --- |
| WASD / arrow keys | Move | ✅ |
| Shift | Sprint | ✅ |
| Tab | Switch to the player nearest the ball | ✅ |
| Space | Pass | Step 3 |
| Esc | Pause | Step 6 |

**Touch**

| Gesture | Action | Working? |
| --- | --- | --- |
| Drag anywhere on the left half | Run. Drag further to sprint. | ✅ |
| **SWITCH** button, bottom right | Switch player | ✅ |
| **PASS** button | Pass | Step 3 |
| Pause icon, top right | Pause | Step 6 |

The joystick **floats**: it appears wherever your thumb lands rather than sitting
in a fixed corner, so you never have to look down to find it.

Aim follows the direction you are running. A gamepad works too if one is plugged
in — left stick to move, R2 to sprint, Y/Triangle to switch.

## Where things live

| Path | What it is |
| --- | --- |
| `src/config/rules.ts` | **The rulebook.** Court size, team size, the 7-second rule, fouls, match length. Change a number here and the whole game follows. |
| `src/config/balance.ts` | **The feel.** Run speeds, pass speed, AI difficulty presets. |
| `src/iso/projection.ts` | The only file that knows court metres become screen pixels. |
| `src/iso/court.ts` | Draws the floor, lines, circles and the two captain platforms. |
| `src/entities/` | `Player`, `Captain`, `Ball`. |
| `src/scenes/` | `BootScene` (assets), `MenuScene`, `MatchScene`, `HUDScene`. |
| `src/systems/InputController.ts` | Merges keyboard, touch and gamepad into one answer: which way, how fast, and did you ask to switch. |
| `src/ui/TouchControls.ts` | The floating joystick and the SWITCH button. |
| `src/util/Storage.ts` | The whole persistence layer: a safe wrapper around `localStorage`. |
| `CLAUDE.md` | The full brief and the log of decisions made. Read it first. |

### Swapping in real artwork later

Nothing references an image filename. Every image has a **key** in `TEXTURES`
(`src/scenes/BootScene.ts`), and anything without a real file gets a placeholder
drawn in code. To use real art: drop the file in `public/sprites/` and add one
line to `ASSET_MANIFEST`. No other code changes.

---

## Known limitations at Step 2

- **Only your player moves.** No AI yet — that is Step 5.
- No passing, no catching, no scoring, no fouls, no match clock. Steps 3 and 4.
- Players run through each other. Collisions between players arrive with the
  no-contact foul in Step 4.
- Pause is not wired up yet (Step 6).
- Placeholder art only: players are coloured diamonds, the ball is a circle.
- The production bundle is ~338 KB gzipped, almost all of it Phaser itself. If
  that becomes a problem on mobile data, a custom Phaser build can trim it.

### Debugging tip

Open the browser console and type `game`. That is the live Phaser game.
`game.scene.getScene('Match')` gives you the running match, and from there
`.players` and `.ball` are the actual objects on screen.
