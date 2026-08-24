/**
 * InputController.ts — turns whatever the player pressed into one simple answer:
 * "which way, how fast, and did they ask to switch?"
 *
 * Keyboard, touch and gamepad all feed into the same small result, so the rest
 * of the game never has to know which device is being used.
 *
 * The important trick is in `screenVectorToCourt`. The player presses W meaning
 * "go up the screen", but the court is drawn at an angle, so "up the screen" is
 * a diagonal in court metres. We take the direction they meant on screen and
 * convert it into the direction we must actually move them.
 */

import Phaser from 'phaser'

import type { CourtPoint } from '../config/rules'
import { screenVectorToCourt } from '../iso/projection'
import { TouchControls } from '../ui/TouchControls'

/** Everything the game needs to know about the player's input this frame. */
export interface InputState {
  /** Court-space direction, normalised. Zero when standing still. */
  move: CourtPoint
  /** 0 to 1. Keyboard is always 1; a joystick can ask for a gentle jog. */
  throttle: number
  /** True while the player is asking to sprint. */
  sprint: boolean
}

export class InputController {
  private readonly scene: Phaser.Scene
  private readonly touch: TouchControls

  private keys!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    w: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key
    s: Phaser.Input.Keyboard.Key
    d: Phaser.Input.Keyboard.Key
    shift: Phaser.Input.Keyboard.Key
    tab: Phaser.Input.Keyboard.Key
  }

  private readonly state: InputState = {
    move: { x: 0, y: 0 },
    throttle: 0,
    sprint: false,
  }

  private switchQueued = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.touch = new TouchControls(scene)

    const keyboard = scene.input.keyboard
    if (keyboard) {
      // Without this, Tab moves focus to the browser's address bar instead of
      // reaching the game.
      keyboard.addCapture(['TAB', 'SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT'])

      const K = Phaser.Input.Keyboard.KeyCodes
      this.keys = {
        up: keyboard.addKey(K.UP),
        down: keyboard.addKey(K.DOWN),
        left: keyboard.addKey(K.LEFT),
        right: keyboard.addKey(K.RIGHT),
        w: keyboard.addKey(K.W),
        a: keyboard.addKey(K.A),
        s: keyboard.addKey(K.S),
        d: keyboard.addKey(K.D),
        shift: keyboard.addKey(K.SHIFT),
        tab: keyboard.addKey(K.TAB),
      }

      // Edge-triggered: fires once per press, not once per frame held.
      this.keys.tab.on('down', () => {
        this.switchQueued = true
      })
    }
  }

  /** Read every device and produce this frame's input. */
  update(): InputState {
    // --- Keyboard: build a direction in SCREEN space first. ---
    let screenX = 0
    let screenY = 0

    if (this.keys) {
      if (this.keys.left.isDown || this.keys.a.isDown) screenX -= 1
      if (this.keys.right.isDown || this.keys.d.isDown) screenX += 1
      if (this.keys.up.isDown || this.keys.w.isDown) screenY -= 1
      if (this.keys.down.isDown || this.keys.s.isDown) screenY += 1
    }

    let sprint = this.keys ? this.keys.shift.isDown : false
    let throttle = screenX !== 0 || screenY !== 0 ? 1 : 0

    // --- Touch overrides the keyboard while a thumb is on the stick. ---
    if (this.touch.magnitude > 0) {
      screenX = this.touch.vector.x
      screenY = this.touch.vector.y
      // A small dead zone stops a resting thumb from drifting the player.
      throttle = this.touch.magnitude < 0.16 ? 0 : this.touch.magnitude
      sprint = this.touch.sprinting
    }

    // --- Gamepad, if one happens to be plugged in. ---
    const pad = this.scene.input.gamepad?.getPad(0)
    if (pad) {
      const stickX = pad.leftStick.x
      const stickY = pad.leftStick.y
      const padMagnitude = Math.hypot(stickX, stickY)
      if (padMagnitude > 0.2) {
        screenX = stickX
        screenY = stickY
        throttle = Math.min(1, padMagnitude)
        sprint = pad.R2 > 0.5 || pad.isButtonDown(6)
      }
      // Face button "Y"/"Triangle" switches player, matching Tab.
      if (pad.isButtonDown(3)) this.switchQueued = true
    }

    if (throttle === 0) {
      this.state.move.x = 0
      this.state.move.y = 0
      this.state.throttle = 0
      this.state.sprint = false
      return this.state
    }

    const courtDirection = screenVectorToCourt(screenX, screenY)
    this.state.move.x = courtDirection.x
    this.state.move.y = courtDirection.y
    this.state.throttle = throttle
    this.state.sprint = sprint

    return this.state
  }

  /**
   * Did the player ask to switch since the last time we asked?
   *
   * Reading it clears it, so one press can never be handled twice.
   */
  consumeSwitchRequest(): boolean {
    const requested = this.switchQueued || this.touch.switchQueued
    this.switchQueued = false
    this.touch.switchQueued = false
    return requested
  }

  /** True once the player has used touch, so the HUD can hide keyboard hints. */
  get usingTouch(): boolean {
    return this.touch.isVisible
  }

  destroy(): void {
    this.touch.destroy()
    if (this.keys) {
      this.keys.tab.removeAllListeners()
    }
  }
}
