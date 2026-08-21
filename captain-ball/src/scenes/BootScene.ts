/**
 * BootScene.ts — loads (or invents) every image the game needs, then hands over
 * to the menu.
 *
 * A Phaser "Scene" is one screen of the game with its own objects and update
 * loop. Several can run at once, which is how the HUD floats over the match.
 *
 * THE ASSET RULE, so real artwork can be dropped in later without code changes:
 * every image is referenced by a KEY from `TEXTURES`, never by a filename. On
 * boot we try to load a real file for each key from `ASSET_MANIFEST`. Any key
 * that has no file gets a placeholder drawn in code instead. To switch to real
 * art, add the file to `public/sprites/` and one line to the manifest — nothing
 * else in the game changes.
 */

import Phaser from 'phaser'

import { TEAM_COLOURS } from '../config/balance'

/** Every image key in the game. Nothing outside this file uses a filename. */
export const TEXTURES = {
  playerNorth: 'player-north',
  playerSouth: 'player-south',
  captainNorth: 'captain-north',
  captainSouth: 'captain-south',
  shadow: 'player-shadow',
  selectionRing: 'selection-ring',
  ball: 'ball',
  ballShadow: 'ball-shadow',
} as const

/**
 * Real artwork, when we have any. Files live in `public/sprites/`.
 * Empty today: every texture below is generated in code.
 */
const ASSET_MANIFEST: ReadonlyArray<{ key: string; file: string }> = []

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload(): void {
    for (const asset of ASSET_MANIFEST) {
      this.load.image(asset.key, `sprites/${asset.file}`)
    }
  }

  create(): void {
    this.generateMissingTextures()
    this.scene.start('Menu')
  }

  /** Draw a stand-in for any texture that did not come from a real file. */
  private generateMissingTextures(): void {
    const north = TEAM_COLOURS.north
    const south = TEAM_COLOURS.south

    this.ensure(TEXTURES.playerNorth, () =>
      this.makeGem(TEXTURES.playerNorth, north.primary, north.secondary, 30, 52, false),
    )
    this.ensure(TEXTURES.playerSouth, () =>
      this.makeGem(TEXTURES.playerSouth, south.primary, south.secondary, 30, 52, false),
    )
    this.ensure(TEXTURES.captainNorth, () =>
      this.makeGem(TEXTURES.captainNorth, north.primary, north.secondary, 32, 58, true),
    )
    this.ensure(TEXTURES.captainSouth, () =>
      this.makeGem(TEXTURES.captainSouth, south.primary, south.secondary, 32, 58, true),
    )
    this.ensure(TEXTURES.shadow, () => this.makeEllipse(TEXTURES.shadow, 30, 15, 0x000000, 0.32))
    this.ensure(TEXTURES.ballShadow, () =>
      this.makeEllipse(TEXTURES.ballShadow, 16, 8, 0x000000, 1),
    )
    this.ensure(TEXTURES.selectionRing, () => this.makeSelectionRing())
    this.ensure(TEXTURES.ball, () => this.makeBall())
  }

  private ensure(key: string, build: () => void): void {
    if (this.textures.exists(key)) return
    build()
  }

  /**
   * A player: a tall diamond with a lit left facet and a shaded right facet, so
   * it reads as a solid object under the same lighting as the court.
   * `crowned` adds the captain's notch and a gold rim.
   */
  private makeGem(
    key: string,
    primary: number,
    secondary: number,
    width: number,
    height: number,
    crowned: boolean,
  ): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)

    // Headroom at the top of the texture for the captain's crown.
    const padding = crowned ? 8 : 1
    const hw = width / 2
    const shoulder = height * 0.42
    const at = (x: number, y: number) => ({ x: x + 1, y: y + padding })

    const top = at(hw, 0)
    const left = at(0, shoulder)
    const right = at(width, shoulder)
    const bottom = at(hw, height)

    // Lit half.
    g.fillStyle(primary, 1)
    g.fillPoints([top, left, bottom], true)

    // Shaded half.
    g.fillStyle(secondary, 1)
    g.fillPoints([top, right, bottom], true)

    // A soft highlight down the lit edge gives the shape some volume.
    g.fillStyle(0xffffff, 0.16)
    g.fillPoints([top, at(hw * 0.45, shoulder * 0.9), at(hw, height * 0.72)], true)

    g.lineStyle(2, crowned ? 0xffd24a : 0x0b0f1a, crowned ? 1 : 0.55)
    g.strokePoints([top, left, bottom, right], true, true)

    if (crowned) {
      // Three small gold points above the head: this player is the captain.
      g.fillStyle(0xffd24a, 1)
      g.fillPoints(
        [
          at(hw - 7, 1),
          at(hw - 3.5, -6),
          at(hw, 1),
          at(hw + 3.5, -6),
          at(hw + 7, 1),
        ],
        true,
      )
    }

    g.generateTexture(key, width + 2, height + padding + 2)
    g.destroy()
  }

  private makeEllipse(key: string, width: number, height: number, colour: number, alpha: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(colour, alpha)
    g.fillEllipse(width / 2, height / 2, width, height)
    g.generateTexture(key, width, height)
    g.destroy()
  }

  /** The bright ring under whichever player the human is currently controlling. */
  private makeSelectionRing(): void {
    const width = 42
    const height = 22
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.lineStyle(3, 0xffe66d, 0.95)
    g.strokeEllipse(width / 2, height / 2, width - 4, height - 4)
    g.generateTexture(TEXTURES.selectionRing, width, height)
    g.destroy()
  }

  /** The ball: a pale circle with a seam and a highlight so spin will read later. */
  private makeBall(): void {
    const size = 16
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0xfff4e0, 1)
    g.fillCircle(size / 2, size / 2, size / 2 - 1)
    g.lineStyle(1.5, 0xc4761f, 1)
    g.strokeCircle(size / 2, size / 2, size / 2 - 1)
    g.lineBetween(2, size / 2, size - 2, size / 2)
    g.fillStyle(0xffffff, 0.85)
    g.fillCircle(size * 0.36, size * 0.34, 1.8)
    g.generateTexture(TEXTURES.ball, size, size)
    g.destroy()
  }
}
