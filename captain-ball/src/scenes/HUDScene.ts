/**
 * HUDScene.ts — the score bar and on-screen readouts, drawn in a scene of its
 * own that runs on top of the match.
 *
 * Why a separate scene? Because it must never be depth-sorted with the court.
 * A second scene has its own camera and always draws above the one below it, so
 * the HUD can never end up hidden behind a player.
 *
 * The HUD never reaches into the match to read anything. The match pushes values
 * in through the `set...` methods below. That keeps the two independent, so the
 * HUD can be redesigned without touching game logic.
 *
 * Step 2 adds the sprint meter and the controls hint. The match clock and the
 * 7-second possession indicator arrive in Steps 3 and 4.
 */

import Phaser from 'phaser'

import { TEAM_COLOURS } from '../config/balance'

const BAR_HEIGHT = 44

/** The sprint meter, bottom left. */
const STAMINA_BAR = { x: 16, y: 512, width: 132, height: 7 }

export class HUDScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text
  private staminaFill!: Phaser.GameObjects.Rectangle
  private hintText!: Phaser.GameObjects.Text

  /** Cached so we only redraw the meter when it actually changes. */
  private lastStamina = -1

  constructor() {
    super({ key: 'HUD', active: false })
  }

  create(): void {
    const { width } = this.scale

    // A translucent strip so the score stays readable over the court.
    this.add.rectangle(width / 2, BAR_HEIGHT / 2, width, BAR_HEIGHT, 0x0d1220, 0.82)

    this.add
      .text(width / 2 - 96, BAR_HEIGHT / 2, TEAM_COLOURS.north.name.toUpperCase(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: colourToCss(TEAM_COLOURS.north.primary),
      })
      .setOrigin(1, 0.5)

    this.scoreText = this.add
      .text(width / 2, BAR_HEIGHT / 2, '0  –  0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2 + 96, BAR_HEIGHT / 2, TEAM_COLOURS.south.name.toUpperCase(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: colourToCss(TEAM_COLOURS.south.primary),
      })
      .setOrigin(0, 0.5)

    this.add
      .text(16, BAR_HEIGHT / 2, '1st Half', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#8fa0c4',
      })
      .setOrigin(0, 0.5)

    this.createStaminaBar()

    this.hintText = this.add
      .text(16, 528, 'WASD / arrows move  ·  Shift sprint  ·  Tab switch player', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#6f7f9f',
      })
      .setOrigin(0, 0.5)
  }

  /** Update the scoreline. Called by the rules engine from Step 4. */
  setScore(north: number, south: number): void {
    this.scoreText.setText(`${north}  –  ${south}`)
  }

  /**
   * Set the sprint meter, 0 (empty) to 1 (full).
   * The bar turns amber as it runs low so you notice before you are caught out.
   */
  setStamina(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction))
    if (Math.abs(clamped - this.lastStamina) < 0.005) return
    this.lastStamina = clamped

    this.staminaFill.width = STAMINA_BAR.width * clamped
    this.staminaFill.setFillStyle(clamped < 0.3 ? 0xffb020 : 0x5ce08a, 1)
  }

  /** Swap the keyboard hint for a touch one once the player uses their thumb. */
  setUsingTouch(usingTouch: boolean): void {
    const text = usingTouch
      ? 'Drag anywhere on the left to run  ·  drag further to sprint  ·  SWITCH changes player'
      : 'WASD / arrows move  ·  Shift sprint  ·  Tab switch player'
    if (this.hintText.text !== text) {
      this.hintText.setText(text)
    }
  }

  private createStaminaBar(): void {
    this.add
      .text(STAMINA_BAR.x, STAMINA_BAR.y - 12, 'SPRINT', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#6f7f9f',
      })
      .setOrigin(0, 0.5)

    this.add
      .rectangle(
        STAMINA_BAR.x,
        STAMINA_BAR.y,
        STAMINA_BAR.width,
        STAMINA_BAR.height,
        0xffffff,
        0.12,
      )
      .setOrigin(0, 0.5)

    this.staminaFill = this.add
      .rectangle(
        STAMINA_BAR.x,
        STAMINA_BAR.y,
        STAMINA_BAR.width,
        STAMINA_BAR.height,
        0x5ce08a,
        1,
      )
      .setOrigin(0, 0.5)
  }
}

/** Turn a Phaser colour number such as 0x3d8bfd into the CSS string '#3d8bfd'. */
function colourToCss(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`
}
