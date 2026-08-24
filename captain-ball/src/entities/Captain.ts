/**
 * Captain.ts — the player who stands on the stool and scores the points.
 *
 * A captain is a Player with three differences:
 *   1. They stand at a fixed height off the floor (`RULES.captain.platformHeight`).
 *   2. They cannot leave the platform. They may only shuffle a few centimetres
 *      either side of its centre, which is what `shuffleTo()` enforces.
 *   3. A clean catch by them scores a point. `canCatch()` decides "clean".
 *
 * The catch scoring itself lives in RulesEngine (Step 4) — this class only
 * answers questions about the captain, it does not award anything.
 */

import Phaser from 'phaser'

import {
  RULES,
  platformPosition,
  type CourtPoint,
  type PlayerSpec,
} from '../config/rules'
import { courtDistance } from '../iso/projection'
import { TEXTURES } from '../scenes/BootScene'
import { Player } from './Player'

export class Captain extends Player {
  /** The exact centre of this captain's stool. They orbit this point only. */
  readonly platform: CourtPoint

  constructor(scene: Phaser.Scene, spec: PlayerSpec) {
    super(scene, spec)
    this.platform = platformPosition(spec.team)

    // Snap onto the stool regardless of what the formation asked for, and turn
    // to face back up the court towards their own team.
    this.position.x = this.platform.x
    this.position.y = this.platform.y
    this.facing = spec.team === 'north' ? -Math.PI / 2 : Math.PI / 2
    this.syncView()
  }

  protected override bodyTexture(): string {
    return this.team === 'north' ? TEXTURES.captainNorth : TEXTURES.captainSouth
  }

  /** Standing on a stool, so their feet are one platform-height off the floor. */
  override get z(): number {
    return RULES.captain.platformHeight
  }

  /**
   * Shuffle along the platform to meet a pass.
   *
   * The requested point is clamped to `platformSlack` metres from the centre of
   * the stool, so a captain can lean for a ball but can never step off to chase
   * one. Trying to leave the platform simply does nothing.
   */
  shuffleTo(target: CourtPoint): void {
    const slack = RULES.captain.platformSlack
    const dx = target.x - this.platform.x
    const dy = target.y - this.platform.y
    const distance = Math.hypot(dx, dy)

    if (distance <= slack || distance === 0) {
      this.position.x = this.platform.x + dx
      this.position.y = this.platform.y + dy
    } else {
      this.position.x = this.platform.x + (dx / distance) * slack
      this.position.y = this.platform.y + (dy / distance) * slack
    }

    this.syncView()
  }

  /**
   * Could this captain cleanly catch a ball arriving at the given point?
   *
   * "Cleanly" means within reach of the stool, both across the floor and in
   * height — a pass thrown at their ankles or over their head is not a catch.
   */
  canCatch(ballPosition: CourtPoint, ballHeight: number): boolean {
    const flatDistance = courtDistance(ballPosition, this.position)
    if (flatDistance > RULES.captain.catchRadius) return false

    const lowestReach = this.z - 0.2
    const highestReach = this.z + 2.2
    return ballHeight >= lowestReach && ballHeight <= highestReach
  }

  /** A captain never moves off the platform, so their movement is a no-op shuffle. */
  override placeAt(point: CourtPoint): void {
    this.shuffleTo(point)
  }

  /**
   * Captains cannot be driven around. They are bound to the stool, so ordinary
   * movement does nothing at all — use `shuffleTo()` to lean for a pass.
   */
  override drive(): void {
    this.velocity.x = 0
    this.velocity.y = 0
  }
}
