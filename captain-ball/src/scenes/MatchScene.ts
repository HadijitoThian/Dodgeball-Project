/**
 * MatchScene.ts — the game itself.
 *
 * Step 1 responsibilities, and nothing more:
 *   · work out where the court sits on screen and draw it
 *   · put 14 players (2 x 7) in their starting positions
 *   · put the ball on the centre spot
 *   · depth-sort everything every frame so the isometric view is believable
 *
 * Movement, passing, rules and AI arrive in Steps 2-5 and will plug into the
 * `update()` loop below.
 */

import Phaser from 'phaser'

import { RULES, startingPositions, type TeamId } from '../config/rules'
import { Court } from '../iso/court'
import { centreCourt } from '../iso/projection'
import { Ball } from '../entities/Ball'
import { Captain } from '../entities/Captain'
import { Player } from '../entities/Player'

/** Pixels reserved at the top of the canvas for the HUD scene's score bar. */
const HUD_TOP_PADDING = 52
const HUD_BOTTOM_PADDING = 18

export class MatchScene extends Phaser.Scene {
  private court!: Court
  private players: Player[] = []
  private ball!: Ball

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

    // Give the ball to nobody at kick-off: it sits on the centre spot.
    this.ball.resetTo(RULES.court.centre)

    // Highlight one player so the "you control this one" ring is visible even
    // before movement exists. Step 2 makes the highlight follow your input.
    const startingControl = this.players.find(
      (p) => p.team === 'north' && p.role === 'attacker',
    )
    startingControl?.setControlled(true)

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
      this.court.destroy()
      for (const player of this.players) player.destroy()
      this.players = []
      this.ball.destroy()
    })
  }

  /**
   * The game loop. Phaser calls this every frame.
   * `delta` arrives in milliseconds; everything else in this project works in
   * seconds, so it is converted once here and passed down.
   */
  override update(_time: number, delta: number): void {
    const deltaSeconds = Math.min(delta / 1000, 0.05)

    this.ball.update(deltaSeconds)

    // Depth sorting: recompute every frame so a player who runs "down" the court
    // correctly starts drawing in front of the players behind them.
    for (const player of this.players) {
      player.syncView()
    }
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

  private handleResize(): void {
    this.layoutCourt()
    this.court.draw()
    for (const player of this.players) player.syncView()
    this.ball.syncView()
  }
}
