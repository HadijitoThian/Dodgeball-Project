/**
 * projection.ts — the ONE place where court metres become screen pixels.
 *
 * The whole game thinks in flat metres (see `rules.ts`). Only this file knows
 * that we draw the court at an angle. If every other file goes through
 * `isoToScreen()` and `screenToIso()`, then the day we change the camera angle,
 * the zoom, or the whole projection, we change it here and nowhere else.
 *
 * TERMS, defined once:
 *
 *   "Isometric" (iso) — drawing a flat grid tilted so it looks 3D, without a real
 *   3D engine. A square metre of floor is drawn as a diamond. We use the standard
 *   2:1 diamond: twice as wide as it is tall.
 *
 *   "Depth sort" — the browser draws sprites in whatever order we give it, so we
 *   must sort them ourselves each frame. Things further "down" the court must be
 *   drawn last so they appear in front. `depthFor()` produces that sort key.
 */

import type { CourtPoint } from '../config/rules'

/** A point in the world: flat court position plus height off the floor. */
export interface WorldPoint extends CourtPoint {
  /** Metres above the court floor. Defaults to 0 (on the ground). */
  z?: number
}

/** A point on the canvas, in pixels. */
export interface ScreenPoint {
  x: number
  y: number
}

/**
 * How many pixels one metre is worth.
 *
 * `halfWidth` is half the width of a one-metre floor diamond, `halfHeight` half
 * its height. Keeping `halfHeight = halfWidth / 2` is what makes it a clean 2:1
 * isometric view. `height` is how many pixels one metre of ALTITUDE lifts a
 * sprite up the screen — it is deliberately larger than `halfHeight` so a thrown
 * ball reads clearly as "up in the air" rather than "further away".
 */
export interface IsoScale {
  halfWidth: number
  halfHeight: number
  height: number
}

/** Where court point (0, 0) lands on the canvas, in pixels. */
export interface IsoOrigin {
  x: number
  y: number
}

const DEFAULT_SCALE: IsoScale = { halfWidth: 26, halfHeight: 13, height: 22 }

let scale: IsoScale = { ...DEFAULT_SCALE }
let origin: IsoOrigin = { x: 0, y: 0 }

/** Read the current pixels-per-metre settings. */
export function getScale(): IsoScale {
  return { ...scale }
}

/** Read where court (0, 0) currently sits on screen. */
export function getOrigin(): IsoOrigin {
  return { ...origin }
}

/** Change the zoom. Pass a partial object to tweak one value and keep the rest. */
export function setScale(next: Partial<IsoScale>): void {
  scale = { ...scale, ...next }
}

/** Move the whole court on screen. Used to centre it in the canvas. */
export function setOrigin(x: number, y: number): void {
  origin = { x, y }
}

/**
 * Centre the court inside a canvas of the given size.
 *
 * `padding` reserves space at the top of the canvas for the HUD so the court is
 * not pushed under the score bar.
 */
export function centreCourt(
  canvasWidth: number,
  canvasHeight: number,
  courtWidth: number,
  courtLength: number,
  padding = { top: 0, bottom: 0 },
): void {
  // The four corners of the court project to a diamond. Its widest point is the
  // sum of the two side lengths; its tallest is the same sum on the vertical axis.
  const diamondWidth = (courtWidth + courtLength) * scale.halfWidth
  const diamondHeight = (courtWidth + courtLength) * scale.halfHeight

  // Corner (0, courtLength) is the leftmost point; corner (0, 0) is the topmost.
  const leftMostOffset = -courtLength * scale.halfWidth

  const usableTop = padding.top
  const usableHeight = canvasHeight - padding.top - padding.bottom

  origin = {
    x: (canvasWidth - diamondWidth) / 2 - leftMostOffset,
    y: usableTop + (usableHeight - diamondHeight) / 2,
  }
}

/**
 * Court metres → screen pixels.
 *
 * This is the only formula in the game that knows about the camera angle.
 */
export function isoToScreen(point: WorldPoint): ScreenPoint {
  const z = point.z ?? 0
  return {
    x: origin.x + (point.x - point.y) * scale.halfWidth,
    y: origin.y + (point.x + point.y) * scale.halfHeight - z * scale.height,
  }
}

/**
 * Screen pixels → court metres, assuming the point is on the floor (z = 0).
 *
 * Used for taps and clicks: "where on the court did the player just touch?"
 * This is the exact inverse of `isoToScreen()` for any point with z = 0.
 */
export function screenToIso(screen: ScreenPoint): CourtPoint {
  const dx = (screen.x - origin.x) / scale.halfWidth
  const dy = (screen.y - origin.y) / scale.halfHeight
  return {
    x: (dx + dy) / 2,
    y: (dy - dx) / 2,
  }
}

/**
 * The sort key that decides what is drawn in front of what.
 *
 * Further down the court (larger x + y) means nearer the camera, so it must be
 * drawn later. Height breaks ties: a ball above a player's head draws in front
 * of them. The multipliers just spread the values out so small differences do
 * not collide once the number is rounded.
 */
export function depthFor(point: WorldPoint): number {
  const z = point.z ?? 0
  return (point.x + point.y) * 100 + z * 10
}

/** Straight-line distance between two court points, in metres. */
export function courtDistance(a: CourtPoint, b: CourtPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * The four screen corners of a rectangle given in court metres.
 * Handy for drawing the court, the lines, and any rectangular marking.
 */
export function isoRectCorners(
  x: number,
  y: number,
  width: number,
  length: number,
): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
  return [
    isoToScreen({ x, y }),
    isoToScreen({ x: x + width, y }),
    isoToScreen({ x: x + width, y: y + length }),
    isoToScreen({ x, y: y + length }),
  ]
}

/**
 * Points around a circle on the court floor, already projected to screen.
 * An on-court circle becomes an ellipse on screen, so we walk it as a polygon.
 */
export function isoEllipsePoints(
  centre: CourtPoint,
  radius: number,
  segments = 48,
): ScreenPoint[] {
  const points: ScreenPoint[] = []
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    points.push(
      isoToScreen({
        x: centre.x + Math.cos(angle) * radius,
        y: centre.y + Math.sin(angle) * radius,
      }),
    )
  }
  return points
}

/** Reset zoom and origin. Used by the tests so each one starts clean. */
export function resetProjection(): void {
  scale = { ...DEFAULT_SCALE }
  origin = { x: 0, y: 0 }
}
