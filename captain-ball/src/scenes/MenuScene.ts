/**
 * MenuScene.ts — the title screen.
 *
 * Deliberately plain for now: a title and one big button that starts a match.
 * Settings, difficulty and team colours land here in Step 6.
 *
 * Everything is drawn inside the Phaser canvas rather than as HTML, so it scales
 * with the game on a phone and works identically inside a Capacitor app later.
 */

import Phaser from 'phaser'

import { RULES } from '../config/rules'
import { TEAM_COLOURS } from '../config/balance'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create(): void {
    const { width, height } = this.scale

    this.cameras.main.setBackgroundColor('#0d1220')

    this.add
      .text(width / 2, height * 0.26, 'CAPTAIN BALL', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height * 0.38, '7 a side  ·  pass to your captain  ·  no travelling', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#8fa0c4',
      })
      .setOrigin(0.5)

    this.createPlayButton(width / 2, height * 0.58)

    const halfMinutes = Math.round(RULES.match.halfLengthSeconds / 60)
    this.add
      .text(
        width / 2,
        height * 0.78,
        `${TEAM_COLOURS.north.name} v ${TEAM_COLOURS.south.name}  ·  ` +
          `${RULES.match.halves} x ${halfMinutes} min  ·  ` +
          `${RULES.possession.passWindowSeconds}s to pass`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#6f7f9f',
        },
      )
      .setOrigin(0.5)

    this.add
      .text(width / 2, height - 26, 'Step 1 · court, teams and ball only — no movement yet', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#4c5b78',
      })
      .setOrigin(0.5)
  }

  /**
   * One large, finger-friendly button. Sized well above the ~44px minimum touch
   * target so it is comfortable on a phone.
   */
  private createPlayButton(x: number, y: number): void {
    const buttonWidth = 240
    const buttonHeight = 64

    const background = this.add
      .rectangle(x, y, buttonWidth, buttonHeight, 0x3d8bfd, 1)
      .setStrokeStyle(2, 0x9dc3ff, 1)
      .setInteractive({ useHandCursor: true })

    const label = this.add
      .text(x, y, 'PLAY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    const press = (): void => {
      background.setFillStyle(0x2f6fd0, 1)
      label.setAlpha(0.85)
    }
    const relax = (): void => {
      background.setFillStyle(0x3d8bfd, 1)
      label.setAlpha(1)
    }

    background.on('pointerdown', press)
    background.on('pointerout', relax)
    background.on('pointerup', () => {
      relax()
      this.startMatch()
    })

    // Keyboard and gamepad users should not have to reach for a mouse.
    this.input.keyboard?.once('keydown-ENTER', () => this.startMatch())
    this.input.keyboard?.once('keydown-SPACE', () => this.startMatch())
  }

  private startMatch(): void {
    // The HUD is a second scene running on top of the match, so the score and
    // clock can redraw without touching anything on the court.
    this.scene.start('Match')
    this.scene.launch('HUD')
  }
}
