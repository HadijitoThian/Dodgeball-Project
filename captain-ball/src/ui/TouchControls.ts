/**
 * TouchControls.ts — the on-screen controls for phones and tablets.
 *
 * Two pieces:
 *
 *   A FLOATING JOYSTICK on the left half of the screen. There is no pad sitting
 *   there waiting for you — put your thumb down anywhere on the left and the
 *   stick appears under it. That means you never have to look down to find it,
 *   which is why most mobile sports games work this way. Drag away from where you
 *   pressed to move; the further you drag, the faster you run, up to a limit.
 *
 *   A SWITCH BUTTON on the right, which hands control to the player nearest the
 *   ball. The big PASS button joins it in Step 3.
 *
 * The controls stay hidden until the first real touch, so desktop players never
 * see them. They report raw SCREEN directions — turning that into a court
 * direction is `InputController`'s job, not this file's.
 */

import Phaser from 'phaser'

/** Design-resolution pixels. Everything scales with the canvas. */
const STICK_RADIUS = 62
const THUMB_RADIUS = 26
/** Drag beyond this fraction of the stick radius to trigger a sprint. */
const SPRINT_THRESHOLD = 0.82

const SWITCH_BUTTON = { x: 872, y: 468, radius: 34 }

export class TouchControls {
  /** Direction the thumb is dragged, in screen pixels. Zero when not touched. */
  readonly vector = { x: 0, y: 0 }

  /** 0 when centred, 1 at the edge of the stick. Drives run speed. */
  magnitude = 0

  /** True while the thumb is dragged far enough out to mean "sprint". */
  sprinting = false

  /** Set when SWITCH is tapped. `InputController` clears it after reading. */
  switchQueued = false

  private readonly scene: Phaser.Scene
  private readonly base: Phaser.GameObjects.Arc
  private readonly thumb: Phaser.GameObjects.Arc
  private readonly switchButton: Phaser.GameObjects.Arc
  private readonly switchLabel: Phaser.GameObjects.Text

  /** Which finger owns the joystick. Phaser gives every pointer an id. */
  private stickPointerId: number | null = null
  private stickOrigin = { x: 0, y: 0 }

  private revealed = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    // Allow three simultaneous fingers: stick, switch, and one spare so a
    // stray palm touch cannot lock out the controls.
    scene.input.addPointer(2)

    const depth = 10_000

    this.base = scene.add
      .circle(0, 0, STICK_RADIUS, 0xffffff, 0.1)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setDepth(depth)
      .setVisible(false)

    this.thumb = scene.add
      .circle(0, 0, THUMB_RADIUS, 0xffffff, 0.32)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(depth + 1)
      .setVisible(false)

    this.switchButton = scene.add
      .circle(SWITCH_BUTTON.x, SWITCH_BUTTON.y, SWITCH_BUTTON.radius, 0xffffff, 0.16)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setDepth(depth)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })

    this.switchLabel = scene.add
      .text(SWITCH_BUTTON.x, SWITCH_BUTTON.y, 'SWITCH', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setVisible(false)

    this.switchButton.on('pointerdown', this.onSwitchDown, this)
    this.switchButton.on('pointerup', this.onSwitchUp, this)
    this.switchButton.on('pointerout', this.onSwitchUp, this)

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this)
  }

  /** True once the player has touched the screen at least once. */
  get isVisible(): boolean {
    return this.revealed
  }

  private reveal(): void {
    if (this.revealed) return
    this.revealed = true
    this.switchButton.setVisible(true)
    this.switchLabel.setVisible(true)
  }

  private onSwitchDown(): void {
    this.switchButton.setFillStyle(0xffffff, 0.34)
  }

  private onSwitchUp(pointer: Phaser.Input.Pointer): void {
    this.switchButton.setFillStyle(0xffffff, 0.16)
    // Only count it as a press if the finger came up over the button.
    if (this.switchButton.getBounds().contains(pointer.x, pointer.y)) {
      this.switchQueued = true
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) return
    this.reveal()

    // The joystick lives on the left half only, so the right side stays free
    // for the action buttons.
    if (pointer.x > this.scene.scale.width / 2) return
    if (this.stickPointerId !== null) return

    this.stickPointerId = pointer.id
    this.stickOrigin = { x: pointer.x, y: pointer.y }

    this.base.setPosition(pointer.x, pointer.y).setVisible(true)
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true)
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId) return

    let dx = pointer.x - this.stickOrigin.x
    let dy = pointer.y - this.stickOrigin.y
    const distance = Math.hypot(dx, dy)

    // Clamp the thumb to the edge of the stick, but keep its direction.
    if (distance > STICK_RADIUS) {
      dx = (dx / distance) * STICK_RADIUS
      dy = (dy / distance) * STICK_RADIUS
    }

    this.thumb.setPosition(this.stickOrigin.x + dx, this.stickOrigin.y + dy)

    this.vector.x = dx
    this.vector.y = dy
    this.magnitude = Math.min(1, distance / STICK_RADIUS)
    this.sprinting = this.magnitude >= SPRINT_THRESHOLD
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId) return
    this.release()
  }

  /** Drop the stick and stop the player. */
  private release(): void {
    this.stickPointerId = null
    this.vector.x = 0
    this.vector.y = 0
    this.magnitude = 0
    this.sprinting = false
    this.base.setVisible(false)
    this.thumb.setVisible(false)
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this)

    this.base.destroy()
    this.thumb.destroy()
    this.switchButton.destroy()
    this.switchLabel.destroy()
  }
}
