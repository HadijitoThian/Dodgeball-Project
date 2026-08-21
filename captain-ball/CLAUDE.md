# CLAUDE.md — Captain Ball

**Read this file at the start of every session. It is the source of truth.**

You are the lead engineer on **Captain Ball**, a 2.5D isometric sports video game.
Think "FIFA, but for captain ball." The founder is the product owner. The founder
is a vibe coder, not a trained engineer — follow the **Working Rules** strictly.

---

## 1. What captain ball is (the sport we are simulating)

Captain ball is a team passing sport popular in Singapore, Malaysia and Indonesia.
These are the default rules. They are **data-driven** — every number below lives in
`src/config/rules.ts` and can be changed without touching game logic.

- Rectangular indoor court. Two teams of **7 players** each.
- Each team has one **Captain** who stands on a raised platform (stool) at the
  **opponent-end** of the court, inside a **restricted circle** that no other
  player may enter.
- A team scores **1 point** when the Captain, standing on the platform, cleanly
  catches a pass thrown by a teammate.
- **No running with the ball.** The ball carrier may pivot on one planted foot but
  cannot travel. Landing steps when catching on the move: default **1** allowed
  step (`possession.maxSteps` in `rules.ts`; `0` = strict pivot-only, `2` = looser
  house rule). **No dribbling.**
- **7-second rule:** the ball carrier must pass within 7 seconds or possession
  turns over. (`possession.passWindowSeconds`)
- **No contact.** Pushing, grabbing or bumping = foul → free pass to the other
  team from the spot of the foul.
- Defenders may intercept passes and block throwing lanes, but may **not** touch
  the Captain or enter the restricted circle.
- Ball out of bounds → throw-in for the team that did **not** touch it last.
- After a score, play restarts from the **centre** with the team that conceded.
- Match = **two halves**, default **5 minutes** per half (configurable). Highest
  score wins. Tie → **sudden-death overtime**.

**Player roles** (for AI behaviour and formations): Captain, Attacker (×3),
Defender (×3). Formation is configurable; `DEFAULT_FORMATION` in `rules.ts` is the
one we ship.

### The single easiest thing to get backwards

A team's Captain stands at the **opponent's** end. So the **north** team defends
`y = 0` and attacks towards `y = length`, because that is where its own Captain is
standing. `tests/rules.test.ts` pins this down — if you "fix" it, tests fail.

---

## 2. Target platforms

- **Phase 1 (now):** web browser, desktop + Android Chrome. Must run at 60 fps on
  a mid-range Android phone. **Touch controls are first-class, not an afterthought.**
- **Phase 2 (later):** Android app via Capacitor wrapping the same web build.
  Do not add Capacitor yet, but do not write anything that would block it — no
  Node-only APIs in game code, all assets bundled locally, no reliance on a backend.

---

## 3. Tech stack (do not deviate without asking)

- **Phaser 3** (currently 3.90.0) + **TypeScript** + **Vite**. Phaser handles
  rendering, input, physics (Arcade Physics is enough), audio, scenes.
- **Isometric 2.5D rendered by hand:** game logic stays in a simple 2D "court
  coordinate" system (metres); conversion to screen happens in exactly one place,
  `src/iso/projection.ts` (`isoToScreen()` / `screenToIso()`). Depth-sort sprites
  by court position every frame.
- **No backend, no database, no login** in Phase 1. Settings and progress go to
  `localStorage` behind the `Storage` wrapper in `src/util/Storage.ts`.
- **Styling outside the canvas:** minimal plain CSS, inlined in `index.html`.
  There is no Tailwind and no CSS framework — the HUD and menus are drawn inside
  the Phaser canvas so they scale with the game on a phone.
- **Art:** placeholder shapes generated in code (coloured diamonds for players, a
  circle for the ball, an isometric court). The asset loader is keyed
  (`TEXTURES` + `ASSET_MANIFEST` in `BootScene.ts`) so real sprite sheets drop in
  by adding a file to `public/sprites/` and one manifest line — no other changes.
- **Deploy:** static build to Vercel from GitHub `main`. See `vercel.json`.
- **Package manager:** npm. Node 20+.

---

## 4. Project structure

```
captain-ball/
  CLAUDE.md                ← this file
  README.md                ← how to run, build, deploy, controls
  package.json
  vite.config.ts
  tsconfig.json
  vercel.json
  index.html
  public/                  ← static assets (sprites, audio) — placeholder-only for now
  src/
    main.ts                ← boots Phaser, registers scenes
    config/
      rules.ts             ← ALL sport rules as constants (timers, team size, court size)
      balance.ts           ← AI difficulty, pass speed, error rates
    iso/
      projection.ts        ← iso <-> screen conversion, depth sorting
      court.ts             ← draws the court, lines, platforms, restricted circles
    entities/
      Player.ts            ← position, role, team, state machine (idle/move/hold/throw)
      Captain.ts           ← extends Player; catch logic, stays on platform
      Ball.ts              ← in-flight arc, owner, last-touched-by
    systems/
      RulesEngine.ts       ← scoring, 7-second rule, fouls, out of bounds, restarts
      PassSystem.ts        ← aim, power, interception checks
      MatchClock.ts        ← halves, overtime, pause
      AIController.ts      ← behaviour per role; difficulty from balance.ts
      InputController.ts   ← keyboard/gamepad + touch (virtual stick + 2 buttons)
    scenes/
      BootScene.ts
      MenuScene.ts
      MatchScene.ts        ← the game
      HUDScene.ts          ← score, clock, 7-second indicator (runs in parallel)
      ResultScene.ts
    ui/                    ← reusable UI pieces (buttons, overlays)
    util/
      Storage.ts
  tests/                   ← Vitest unit tests for RulesEngine and projection math
```

Files under `systems/`, `ui/` and `ResultScene.ts` are created in the step that
first needs them, so the tree never carries empty stubs.

---

## 5. Phase 1 feature scope (MVP) — build in this order

Each step must end with a running game that opens in the browser. **Do not start
the next step until the founder says the current one works.**

1. **Skeleton** — Vite + Phaser + TS boots, shows an isometric court with 14
   placeholder players in starting positions and a ball at centre. Deployable to
   Vercel. ✅ **done**
2. **Movement + control** — control one highlighted player with WASD/arrows
   (desktop) and a virtual joystick (touch). Player switching: nearest-to-ball on
   button press (like FIFA's switch). Depth sorting correct.
3. **Passing + catching** — press/tap to pass toward aim direction; ball flies in
   an arc; nearest teammate in the lane catches it. 7-second timer shown in HUD.
   Turnover on expiry.
4. **Scoring + rules** — pass to Captain on platform = point, restart from centre.
   Out of bounds, restricted-circle violation, basic no-contact foul (players
   overlap while one holds ball). Match clock, halves, result screen.
5. **AI opponents + teammates** — role-based AI (Attackers get open, Defenders
   mark and block lanes, Captain repositions on platform). Three difficulty levels
   from `balance.ts`.
6. **Polish pass** — sound effects (placeholder beeps), pause menu, settings
   (half length, difficulty, team colours), persistent settings via `Storage`.

**Explicitly out of scope for Phase 1:** online multiplayer, career mode, licensed
teams, real art, leagues, in-app purchases. Do not build stubs for these.

---

## 6. Controls

**Desktop:** WASD/arrows move · Space = pass · Shift = sprint · Tab = switch
player · Esc = pause.

**Touch:** left half of screen = virtual joystick · right side = PASS (big) and
SWITCH (small) buttons · pause icon top-right.

**Aim** = movement direction. Gamepad support is a nice-to-have.

---

## 7. Working Rules (how to work with the founder)

- **Small steps.** One feature at a time. After each step, report: what changed,
  which files, the exact command to run, and what should appear on screen.
- **Complete files only.** When creating or changing a file, write the whole file.
  Never hand over fragments to slot in.
- **Plain language.** Explain each piece in one or two sentences. Define any
  technical term (e.g. "scene", "tween", "depth sort") the first time it is used.
- **Warn before risk.** If a command deletes, overwrites or changes config, say so
  first and explain how to undo it.
- **Windows / PowerShell.** The founder runs commands in PowerShell on Windows.
  Give PowerShell-compatible commands — no `&&` chains, use separate lines.
- **Ask, don't assume,** when a rule of the sport or a design decision is
  ambiguous. One question at a time.
- **Keep it cheap.** No paid services, no heavy libraries when Phaser already
  does the job.
- **Tests for the RulesEngine and projection math only** (Vitest). Do not test
  rendering.
- **Commit after each step** with a clear message. The founder pushes to GitHub
  unless they ask otherwise.
- **Keep this file updated.** When a decision changes, edit it here.

---

## 8. Definition of done for Phase 1

A stranger can open the Vercel URL on their Android phone, tap Play, and finish a
full 5-minute-per-half match against Medium AI, with scoring, turnovers and the
clock all working, without a crash. Then Phase 2 begins (Capacitor → Play Store).

---

## 9. Decisions log

Changes to the original brief, and why. Newest last.

| Date | Decision |
| --- | --- |
| 2026-08-21 | **Captain Ball lives in the `captain-ball/` sub-folder**, not the repo root. The repo already contained an unrelated React game, *Dodgeball Stars*, which was left untouched. Vercel's **Root Directory** must therefore be set to `captain-ball`. |
| 2026-08-21 | **Shot clock is 7 seconds, not 3.** The brief said "7 seconds" in the rules and "3-second rule" in the file list. 7 won. It is one constant: `RULES.possession.passWindowSeconds`. |
| 2026-08-21 | **Court is 12 m × 20 m**, restricted circle radius 2 m, platform 2.5 m in from the end line, 0.5 m high. The brief did not specify dimensions; these were chosen to give a readable isometric view at the 960×540 design resolution. Change them in `rules.ts` and everything follows. |
| 2026-08-21 | **No Tailwind.** The HUD and menus are drawn inside the Phaser canvas so they scale with the game on a phone and behave identically inside Capacitor. The only CSS is a few lines inlined in `index.html`. |
| 2026-08-21 | **Fixed 960×540 design resolution** with `Phaser.Scale.FIT`. Every coordinate and font size is written once and letterboxes onto any screen. |
| 2026-08-21 | **The default formation is constrained by a test.** Both teams share one formation, mirrored, so it is easy to pick numbers where a defender of one team spawns standing inside an attacker of the other — the first draft did exactly that, and also started a defender inside the restricted circle. `tests/rules.test.ts` now enforces a 1.5 m minimum spawn gap and circle clearance. |
