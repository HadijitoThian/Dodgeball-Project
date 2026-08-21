/**
 * HUDScene.ts — the score bar, drawn in a scene of its own that runs on top of
 * the match.
 *
 * Why a separate scene? Because it must never be depth-sorted with the court.
 * A second scene has its own camera and always draws above the one below it, so
 * the HUD can never end up behind a player.
 *
 * Step 1 shows the two teams and a 0-0 scoreline. The match clock, the
 * 7-second possession indicator and the foul/turnover flashes arrive in
 * Steps 3 and 4.
 */

import Phaser from 'phaser'

import { TEAM_COLOURS } from '../config/balance'

const BAR_HEIGHT = 44

export class HUDScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text

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
  }

  /** Update the scoreline. Called by the rules engine from Step 4. */
  setScore(north: number, south: number): void {
    this.scoreText.setText(`${north}  –  ${south}`)
  }
}

/** Turn a Phaser colour number such as 0x3d8bfd into the CSS string '#3d8bfd'. */
function colourToCss(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`
}
