/**
 * MatchScene.ts — the game itself.
 *
 * What works so far:
 *   Step 1 · the court, 14 players in formation, the ball, depth sorting
 *   Step 2 · you control one highlighted player; switching to the player nearest
 *            the ball; keyboard, touch and gamepad all drive the same code
 *
 * Passing, the rules and the AI arrive in Steps 3-5 and plug into `update()`.
 *
 * Note that only the player you control moves. The other thirteen stand still
 * until the AI is written in Step 5 — that is expected, not a bug.
 */

import Phaser from 'phaser'

import { RULES, startingPositions, type TeamId } from '../config/rules'
import { Court } from '../iso/court'
import { centreCourt, courtDistance } from '../iso/projection'
import { Ball } from '../entities/Ball'
import { Captain } from '../entities/Captain'
import { Player } from '../entities/Player'
import { InputController } from '../systems/InputController'
import type { HUDScene } from './HUDScene'

/** Pixels reserved at the top and bottom of the canvas for the HUD. */
const HUD_TOP_PADDING = 52
const HUD_BOTTOM_PADDING = 18

/** The side the human plays for. Choosing sides arrives with the menu in Step 6. */
const PLAYER_TEAM: TeamId = 'north'

export class MatchScene extends Phaser.Scene {
  private court!: Court
  private players: Player[] = []
  private ball!: Ball
  private controls!: InputController

  /** The player currently under human control. Never a captain. */
  private controlled: Player | null = null

  constructor() {
    super('Match')
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d1220')

    this.layoutCourt()
    this.court = new Court(this)
    this.court.draw()

    this.spawnTeam('north')
    this.spawnTeam('south')

    this.ball = new Ball(this, RULES.court.centre)
    this.ball.resetTo(RULES.court.centre)

    this.controls = new InputController(this)

    // Start in control of whoever is nearest the ball, exactly as the switch
    // button would pick.
    this.takeControlOf(this.nearestOutfielderToBall())

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this)
  }

  /**
   * The game loop. Phaser calls this every frame.
   * `delta` arrives in milliseconds; the rest of the project works in seconds,
   * so it is converted once here. It is also capped: if the browser tab is
   * backgrounded and comes back after a long pause, we do not want players
   * teleporting across the court in a single enormous frame.
   */
  override update(_time: number, delta: number): void {
    const deltaSeconds = Math.min(delta / 1000, 0.05)

    const state = this.controls.update()

    if (this.controls.consumeSwitchRequest()) {
      this.switchPlayer()
    }

    this.controlled?.drive(state.move, state.throttle, state.sprint, deltaSeconds)

    this.ball.update(deltaSeconds)

    // Depth sorting: recompute every frame so a player who runs "down" the court
    // correctly starts drawing in front of the players behind them.
    for (const player of this.players) {
      player.syncView()
    }

    this.publishHudState()
  }

  /** Work out the pixels-per-metre and where court (0,0) lands on the canvas. */
  private layoutCourt(): void {
    centreCourt(
      this.scale.width,
      this.scale.height,
      RULES.court.width,
      RULES.court.length,
      { top: HUD_TOP_PADDING, bottom: HUD_BOTTOM_PADDING },
    )
  }

  /** Create one team's seven players from the formation in `rules.ts`. */
  private spawnTeam(team: TeamId): void {
    for (const spec of startingPositions(team)) {
      const player =
        spec.role === 'captain' ? new Captain(this, spec) : new Player(this, spec)
      this.players.push(player)
    }
  }

  /** Everyone on the human's team who can actually be controlled. */
  private get controllableTeammates(): Player[] {
    return this.players.filter((p) => p.team === PLAYER_TEAM && p.role !== 'captain')
  }

  /**
   * Hand control to the player nearest the ball, the way FIFA's switch button
   * works. If that player is already the one you are controlling, move on to the
   * next nearest — otherwise pressing switch when you are closest does nothing
   * and feels broken.
   */
  private switchPlayer(): void {
    const ranked = this.rankByDistanceToBall(this.controllableTeammates)
    if (ranked.length === 0) return

    const currentIndex = this.controlled ? ranked.indexOf(this.controlled) : -1
    const next = currentIndex === 0 ? ranked[1] ?? ranked[0] : ranked[0]

    this.takeControlOf(next ?? null)
  }

  private nearestOutfielderToBall(): Player | null {
    return this.rankByDistanceToBall(this.controllableTeammates)[0] ?? null
  }

  private rankByDistanceToBall(candidates: Player[]): Player[] {
    return [...candidates].sort(
      (a, b) =>
        courtDistance(a.position, this.ball.position) -
        courtDistance(b.position, this.ball.position),
    )
  }

  private takeControlOf(player: Player | null): void {
    if (player === this.controlled) return

    this.controlled?.setControlled(false)
    this.controlled = player
    this.controlled?.setControlled(true)
  }

  /** Tell the HUD what to draw. The HUD never reaches into the match itself. */
  private publishHudState(): void {
    const hud = this.scene.get('HUD') as HUDScene | undefined
    hud?.setStamina?.(this.controlled?.staminaFraction ?? 1)
    hud?.setUsingTouch?.(this.controls.usingTouch)
  }

  private handleResize(): void {
    this.layoutCourt()
    this.court.draw()
    for (const player of this.players) player.syncView()
    this.ball.syncView()
  }

  private teardown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.controls.destroy()
    this.court.destroy()
    for (const player of this.players) player.destroy()
    this.players = []
    this.controlled = null
    this.ball.destroy()
  }
}
