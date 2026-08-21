/**
 * Player.ts — one player on the court.
 *
 * A Player owns two things kept deliberately separate:
 *   1. GAME STATE in court metres — where they are, who they play for, what
 *      they are doing. This is what the rules and the AI care about.
 *   2. A VIEW — the sprites that represent them on screen. The view is a dumb
 *      mirror: `syncView()` copies state onto sprites once per frame.
 *
 * Keeping those apart is what lets us unit-test the rules without a browser,
 * and swap placeholder diamonds for real artwork without touching game logic.
 *
 * A Phaser "Container" is a group of sprites that move and sort as one, which is
 * how a player's shadow, body and shirt number stay glued together.
 */

import Phaser from 'phaser'

import type { CourtPoint, PlayerSpec, Role, TeamId } from '../config/rules'
import { TEAM_COLOURS } from '../config/balance'
import { depthFor, isoToScreen } from '../iso/projection'
import { TEXTURES } from '../scenes/BootScene'

/**
 * What a player is doing right now.
 *   idle  — standing, no ball
 *   move  — running, no ball
 *   hold  — has the ball; the 7-second clock is running on them
 *   throw — mid pass release; briefly locked out of moving
 */
export type PlayerState = 'idle' | 'move' | 'hold' | 'throw'

export class Player {
  readonly id: string
  readonly team: TeamId
  readonly role: Role
  readonly number: number

  /** Flat court position in metres. */
  readonly position: CourtPoint

  /** Which way the player is facing, in radians on the court plane. Aim uses this. */
  facing = 0

  /** Current speed in metres per second, used from Step 2 onwards. */
  readonly velocity: CourtPoint = { x: 0, y: 0 }

  /** True while this player is the one the human is controlling. */
  isControlled = false

  protected currentState: PlayerState = 'idle'

  protected readonly scene: Phaser.Scene
  protected readonly container: Phaser.GameObjects.Container
  protected readonly shadow: Phaser.GameObjects.Image
  protected readonly body: Phaser.GameObjects.Image
  protected readonly label: Phaser.GameObjects.Text
  protected readonly selectionRing: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene, spec: PlayerSpec) {
    this.scene = scene
    this.id = spec.id
    this.team = spec.team
    this.role = spec.role
    this.number = spec.number
    this.position = { x: spec.start.x, y: spec.start.y }

    // Face down the court towards your own captain — the direction you attack.
    this.facing = spec.team === 'north' ? Math.PI / 2 : -Math.PI / 2

    this.shadow = scene.add.image(0, 0, TEXTURES.shadow).setOrigin(0.5, 0.5)
    this.selectionRing = scene.add
      .image(0, 0, TEXTURES.selectionRing)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    this.body = scene.add.image(0, 0, this.bodyTexture()).setOrigin(0.5, 1)
    this.label = scene.add
      .text(0, 0, String(spec.number), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5)

    // Order matters: shadow and ring on the floor, body above them, number on top.
    this.container = scene.add.container(0, 0, [
      this.shadow,
      this.selectionRing,
      this.body,
      this.label,
    ])

    this.layoutView()
    this.syncView()
  }

  /** The texture key for this player's body. Overridden by Captain. */
  protected bodyTexture(): string {
    return this.team === 'north' ? TEXTURES.playerNorth : TEXTURES.playerSouth
  }

  /** Height of this player's feet above the floor. Outfield players stand on it. */
  get z(): number {
    return 0
  }

  /** Where the ball is held or caught, relative to this player, in metres up. */
  get handHeight(): number {
    return this.z + 1.1
  }

  get state(): PlayerState {
    return this.currentState
  }

  /** True when this player is holding the ball. */
  get hasBall(): boolean {
    return this.currentState === 'hold' || this.currentState === 'throw'
  }

  /**
   * Change what the player is doing.
   * Kept as a single method so later steps can hook animation or sound onto it.
   */
  setState(next: PlayerState): void {
    if (this.currentState === next) return
    this.currentState = next
  }

  /** Move to an exact court position. Used for kick-off and restarts. */
  placeAt(point: CourtPoint): void {
    this.position.x = point.x
    this.position.y = point.y
    this.velocity.x = 0
    this.velocity.y = 0
    this.syncView()
  }

  /** Highlight this player as the one under human control. */
  setControlled(controlled: boolean): void {
    this.isControlled = controlled
    this.selectionRing.setVisible(controlled)
  }

  /**
   * Copy court state onto the sprites. Called every frame for every player.
   * This is also where depth sorting happens: further down the court draws later.
   */
  syncView(): void {
    const screen = isoToScreen({ x: this.position.x, y: this.position.y, z: this.z })
    this.container.setPosition(screen.x, screen.y)
    this.container.setDepth(depthFor({ x: this.position.x, y: this.position.y, z: this.z }))
  }

  /** Position the child sprites inside the container. Only needed once. */
  protected layoutView(): void {
    this.shadow.setPosition(0, 0)
    this.selectionRing.setPosition(0, 0)
    this.body.setPosition(0, 2)
    this.label.setPosition(0, -this.body.height * 0.55)
  }

  /** The team's shirt colour, handy for HUD and effects. */
  get colour(): number {
    return TEAM_COLOURS[this.team].primary
  }

  destroy(): void {
    this.container.destroy(true)
  }
}
