/**
 * main.ts — starts the game.
 *
 * This is the only file the browser loads directly. It builds the Phaser game
 * with a fixed 960x540 "design resolution" and lets Phaser scale that to fit
 * whatever screen it lands on. Working at one fixed size means every position,
 * font size and button in the game is written once and looks the same on a
 * desktop monitor and a phone.
 *
 * Nothing here touches Node APIs or the network, so this same build can be
 * wrapped by Capacitor for the Play Store in Phase 2 without changes.
 */

import Phaser from 'phaser'

import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { MatchScene } from './scenes/MatchScene'
import { HUDScene } from './scenes/HUDScene'

/** The resolution the whole game is designed against. */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0d1220',
  scale: {
    // FIT keeps the 16:9 shape and letterboxes anything else, so nothing is
    // ever cut off on an unusual phone screen.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  fps: {
    target: 60,
    // Skip physics catch-up on a slow frame rather than stuttering the whole game.
    forceSetTimeOut: false,
  },
  // Arcade is Phaser's lightweight physics. Step 3 uses it for pass collisions.
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { x: 0, y: 0 } },
  },
  input: {
    // Gamepad support is a nice-to-have, and costs nothing to leave switched on.
    gamepad: true,
  },
  scene: [BootScene, MenuScene, MatchScene, HUDScene],
}

const game = new Phaser.Game(config)

// Handy when something looks wrong: open the browser console and type `game`.
// From there `game.scene.getScene('Match')` gives you the live match to poke at.
;(window as unknown as { game: Phaser.Game }).game = game
