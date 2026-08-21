/**
 * Ball.ts — the ball, its flight, and who touched it last.
 *
 * The ball is always in exactly one of three situations:
 *   held   — a player has it. It sits at their hand height and follows them.
 *   flight — it is travelling between two points along an arc.
 *   loose   — nobody has it and it is rolling or sitting on the floor.
 *
 * `lastTouchedBy` is deliberately kept here rather than in the rules engine,
 * because the out-of-bounds rule ("throw-in to whoever did NOT touch it last")
 * needs it, and so does interception credit.
 *
 * Flight uses a simple parabola rather than real physics: we know where the ball
 * left from and where it is aimed, so we interpolate between them and add a
 * height curve. It is cheap, predictable, and easy to write rules against.
 */

import Phaser from 'phaser'

import { BALL } from '../config/balance'
import type { CourtPoint, TeamId } from '../config/rules'
import { depthFor, isoToScreen } from '../iso/projection'
import { TEXTURES } from '../scenes/BootScene'
import type { Player } from './Player'

export type BallState = 'held' | 'flight' | 'loose'

/** Who last made contact with the ball, and for which team. */
export interface Touch {
  playerId: string
  team: TeamId
}

export class Ball {
  /** Flat court position in metres. */
  readonly position: CourtPoint = { x: 0, y: 0 }

  /** Height above the floor in metres. */
  height = 0

  private currentState: BallState = 'loose'

  /** The player currently holding the ball, if any. */
  private holder: Player | null = null

  /** Whoever touched it last, even if they no longer hold it. */
  lastTouchedBy: Touch | null = null

  // Flight bookkeeping. Only meaningful while `currentState === 'flight'`.
  private flightFrom: CourtPoint = { x: 0, y: 0 }
  private flightTo: CourtPoint = { x: 0, y: 0 }
  private flightFromHeight = 0
  private flightProgress = 0
  private flightDuration = 0
  private flightArc: number = BALL.arcHeight

  private readonly sprite: Phaser.GameObjects.Image
  private readonly shadow: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene, start: CourtPoint) {
    this.position.x = start.x
    this.position.y = start.y

    // The shadow always sits on the floor directly under the ball. It is the
    // main cue that tells you how high a pass is travelling.
    this.shadow = scene.add.image(0, 0, TEXTURES.ballShadow).setOrigin(0.5, 0.5)
    this.sprite = scene.add.image(0, 0, TEXTURES.ball).setOrigin(0.5, 0.5)

    this.syncView()
  }

  get state(): BallState {
    return this.currentState
  }

  /** The player holding the ball, or null if it is in flight or loose. */
  get owner(): Player | null {
    return this.holder
  }

  /** Give the ball to a player. Records the touch for the out-of-bounds rule. */
  attachTo(player: Player): void {
    this.holder = player
    this.currentState = 'held'
    this.flightProgress = 0
    this.lastTouchedBy = { playerId: player.id, team: player.team }
    this.followHolder()
  }

  /** Drop the ball where it is, with nobody holding it. */
  release(): void {
    this.holder = null
    this.currentState = 'loose'
  }

  /**
   * Throw the ball towards a court point.
   *
   * `speed` is metres per second along the ground; the flight time follows from
   * the distance, so a long pass hangs in the air longer than a short one.
   */
  throwTo(target: CourtPoint, speed: number = BALL.passSpeed, arc: number = BALL.arcHeight): void {
    const from = { x: this.position.x, y: this.position.y }
    const distance = Math.hypot(target.x - from.x, target.y - from.y)

    this.flightFrom = from
    this.flightTo = { x: target.x, y: target.y }
    this.flightFromHeight = this.height
    this.flightProgress = 0
    this.flightDuration = Math.max(0.08, distance / Math.max(0.1, speed))
    this.flightArc = arc

    this.holder = null
    this.currentState = 'flight'
  }

  /**
   * Advance the ball by `deltaSeconds`.
   *
   * Returns true on the frame a pass finishes its flight, so the caller can run
   * catch and interception checks at exactly the right moment.
   */
  update(deltaSeconds: number): boolean {
    if (this.currentState === 'held') {
      this.followHolder()
      this.syncView()
      return false
    }

    if (this.currentState === 'flight') {
      this.flightProgress += deltaSeconds / this.flightDuration
      const t = Math.min(1, this.flightProgress)

      this.position.x = this.flightFrom.x + (this.flightTo.x - this.flightFrom.x) * t
      this.position.y = this.flightFrom.y + (this.flightTo.y - this.flightFrom.y) * t

      // Straight-line height from release to landing, plus a parabola on top.
      // `4 * t * (1 - t)` peaks at 1.0 when t is 0.5, which is the top of the arc.
      const baseHeight = this.flightFromHeight * (1 - t)
      this.height = baseHeight + this.flightArc * 4 * t * (1 - t)

      this.syncView()

      if (t >= 1) {
        this.height = 0
        this.currentState = 'loose'
        this.syncView()
        return true
      }
      return false
    }

    // Loose: settle onto the floor.
    if (this.height > 0) {
      this.height = Math.max(0, this.height - BALL.groundFriction * deltaSeconds)
    }
    this.syncView()
    return false
  }

  /** Where the ball is aimed to land. Only meaningful during a pass. */
  get flightTarget(): CourtPoint | null {
    return this.currentState === 'flight' ? { ...this.flightTo } : null
  }

  /** 0 at release, 1 on arrival. Only meaningful during a pass. */
  get flightCompletion(): number {
    return this.currentState === 'flight' ? Math.min(1, this.flightProgress) : 0
  }

  /** Put the ball back at a court point with nobody holding it. */
  resetTo(point: CourtPoint): void {
    this.position.x = point.x
    this.position.y = point.y
    this.height = 0
    this.holder = null
    this.currentState = 'loose'
    this.lastTouchedBy = null
    this.flightProgress = 0
    this.syncView()
  }

  private followHolder(): void {
    if (!this.holder) return
    // Sit just in front of the holder's chest, on the side they are facing.
    const offset = 0.35
    this.position.x = this.holder.position.x + Math.cos(this.holder.facing) * offset
    this.position.y = this.holder.position.y + Math.sin(this.holder.facing) * offset
    this.height = this.holder.handHeight
  }

  /** Copy court state onto the two sprites, including depth sorting. */
  syncView(): void {
    const world = { x: this.position.x, y: this.position.y, z: this.height }
    const screen = isoToScreen(world)
    const floor = isoToScreen({ x: this.position.x, y: this.position.y })

    this.sprite.setPosition(screen.x, screen.y)
    this.sprite.setDepth(depthFor(world) + 5)

    // The higher the ball, the smaller and fainter its shadow.
    const shrink = Math.max(0.45, 1 - this.height * 0.18)
    this.shadow.setPosition(floor.x, floor.y)
    this.shadow.setScale(shrink)
    this.shadow.setAlpha(Math.max(0.12, 0.4 - this.height * 0.05))
    this.shadow.setDepth(depthFor({ x: this.position.x, y: this.position.y }) - 1)
  }

  destroy(): void {
    this.sprite.destroy()
    this.shadow.destroy()
  }
}
