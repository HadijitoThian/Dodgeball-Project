/**
 * court.ts — draws the playing surface: floor, lines, centre circle, the two
 * restricted circles and the two captain platforms.
 *
 * All of it is vector drawing done in code — no image files. Everything is
 * positioned in court metres and pushed through `projection.ts`, so if the
 * camera or zoom changes, the court follows automatically.
 *
 * A Phaser "Graphics" object is a canvas you can draw lines and shapes onto.
 * A "Container" is a group of objects that move and sort together.
 */

import Phaser from 'phaser'

import { RULES, platformPosition, type CourtPoint, type TeamId } from '../config/rules'
import { TEAM_COLOURS } from '../config/balance'
import { depthFor, isoEllipsePoints, isoToScreen, type ScreenPoint } from './projection'

/** Depths low enough that every player and the ball always draw on top. */
const DEPTH_SURROUND = -3000
const DEPTH_FLOOR = -2900
const DEPTH_MARKINGS = -2800

const COLOURS = {
  surround: 0x1b2338,
  floorLight: 0xc98f52,
  floorDark: 0xb87c43,
  line: 0xf3f6ff,
  centreCircle: 0xf3f6ff,
  platformTop: 0xe8edf7,
  platformSide: 0x9aa6bf,
} as const

/** Radius of the captain's stool, in metres. Cosmetic only. */
const PLATFORM_RADIUS = 0.62

/**
 * Builds and owns every graphic that makes up the court.
 *
 * Call `draw()` once after the projection has been centred. Call `destroy()` if
 * the scene is torn down.
 */
export class Court {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /** Draw (or redraw) the whole court. Safe to call again after a resize. */
  draw(): void {
    this.destroy()

    this.drawSurround()
    this.drawFloor()
    this.drawMarkings()
    this.drawPlatform('north')
    this.drawPlatform('south')
  }

  /** Remove every graphic this court created. */
  destroy(): void {
    for (const g of this.graphics) {
      g.destroy()
    }
    this.graphics.length = 0
  }

  /** The dead area outside the lines, so the court does not float in space. */
  private drawSurround(): void {
    const { width, length, surround } = RULES.court
    const g = this.newGraphics(DEPTH_SURROUND)

    g.fillStyle(COLOURS.surround, 1)
    fillPolygon(g, [
      isoToScreen({ x: -surround, y: -surround }),
      isoToScreen({ x: width + surround, y: -surround }),
      isoToScreen({ x: width + surround, y: length + surround }),
      isoToScreen({ x: -surround, y: length + surround }),
    ])
  }

  /**
   * The playing surface, drawn as alternating bands so the isometric angle is
   * readable. Without some texture, a flat diamond is hard to judge distance on.
   */
  private drawFloor(): void {
    const { width, length } = RULES.court
    const g = this.newGraphics(DEPTH_FLOOR)

    const bandLength = 2.5
    const bands = Math.ceil(length / bandLength)

    for (let i = 0; i < bands; i += 1) {
      const y0 = i * bandLength
      const y1 = Math.min(length, y0 + bandLength)
      g.fillStyle(i % 2 === 0 ? COLOURS.floorLight : COLOURS.floorDark, 1)
      fillPolygon(g, [
        isoToScreen({ x: 0, y: y0 }),
        isoToScreen({ x: width, y: y0 }),
        isoToScreen({ x: width, y: y1 }),
        isoToScreen({ x: 0, y: y1 }),
      ])
    }
  }

  /** Boundary lines, halfway line, centre circle and both restricted circles. */
  private drawMarkings(): void {
    const { width, length, centre } = RULES.court
    const g = this.newGraphics(DEPTH_MARKINGS)

    // Outer boundary.
    g.lineStyle(3, COLOURS.line, 0.95)
    strokePolygon(g, [
      isoToScreen({ x: 0, y: 0 }),
      isoToScreen({ x: width, y: 0 }),
      isoToScreen({ x: width, y: length }),
      isoToScreen({ x: 0, y: length }),
    ])

    // Halfway line — where play restarts after a score.
    g.lineStyle(2, COLOURS.line, 0.8)
    strokeLine(g, isoToScreen({ x: 0, y: centre.y }), isoToScreen({ x: width, y: centre.y }))

    // Centre circle.
    g.lineStyle(2, COLOURS.centreCircle, 0.8)
    strokePolygon(g, isoEllipsePoints(centre, 1.8))

    // The two restricted circles. No outfield player of either team may enter
    // these, so they are drawn in the owning captain's team colour.
    this.drawRestrictedCircle(g, 'north')
    this.drawRestrictedCircle(g, 'south')
  }

  private drawRestrictedCircle(g: Phaser.GameObjects.Graphics, team: TeamId): void {
    const centre = platformPosition(team)
    const points = isoEllipsePoints(centre, RULES.captain.restrictedRadius)
    const colour = TEAM_COLOURS[team].primary

    g.fillStyle(colour, 0.14)
    fillPolygon(g, points)

    g.lineStyle(3, colour, 0.9)
    strokePolygon(g, points)
  }

  /**
   * The captain's stool: a short cylinder standing on the court.
   *
   * Its depth is its court position, not a fixed background layer, so players
   * running past correctly appear in front of or behind it.
   */
  private drawPlatform(team: TeamId): void {
    const centre = platformPosition(team)
    const height = RULES.captain.platformHeight
    const g = this.newGraphics(depthFor(centre) - 1)

    const base = ellipseAtHeight(centre, PLATFORM_RADIUS, 0)
    const top = ellipseAtHeight(centre, PLATFORM_RADIUS, height)

    // The side of the cylinder is the band between the front arc of the top
    // circle and the front arc of the base circle.
    const frontTop = frontArc(centre, PLATFORM_RADIUS, height)
    const frontBase = frontArc(centre, PLATFORM_RADIUS, 0)

    g.fillStyle(COLOURS.platformSide, 1)
    fillPolygon(g, [...frontTop, ...[...frontBase].reverse()])

    g.fillStyle(COLOURS.platformTop, 1)
    fillPolygon(g, top)

    g.lineStyle(2, COLOURS.platformSide, 1)
    strokePolygon(g, top)

    // A faint contact shadow so the stool reads as standing on the floor.
    g.fillStyle(0x000000, 0.18)
    fillPolygon(g, base)
  }

  private newGraphics(depth: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics()
    g.setDepth(depth)
    this.graphics.push(g)
    return g
  }
}

/** Screen points around a court circle lifted to a given height. */
function ellipseAtHeight(centre: CourtPoint, radius: number, z: number): ScreenPoint[] {
  const points: ScreenPoint[] = []
  const segments = 40
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    points.push(
      isoToScreen({
        x: centre.x + Math.cos(angle) * radius,
        y: centre.y + Math.sin(angle) * radius,
        z,
      }),
    )
  }
  return points
}

/**
 * The near-side half of a court circle, from its leftmost screen point round to
 * its rightmost. In our 2:1 isometric view those extremes sit at 135 degrees and
 * -45 degrees, with the nearest point to the camera at 45 degrees in between.
 */
function frontArc(centre: CourtPoint, radius: number, z: number): ScreenPoint[] {
  const start = (135 * Math.PI) / 180
  const end = (-45 * Math.PI) / 180
  const segments = 20
  const points: ScreenPoint[] = []
  for (let i = 0; i <= segments; i += 1) {
    const angle = start + ((end - start) * i) / segments
    points.push(
      isoToScreen({
        x: centre.x + Math.cos(angle) * radius,
        y: centre.y + Math.sin(angle) * radius,
        z,
      }),
    )
  }
  return points
}

function fillPolygon(g: Phaser.GameObjects.Graphics, points: ScreenPoint[]): void {
  if (points.length < 3) return
  g.beginPath()
  g.moveTo(points[0]!.x, points[0]!.y)
  for (let i = 1; i < points.length; i += 1) {
    g.lineTo(points[i]!.x, points[i]!.y)
  }
  g.closePath()
  g.fillPath()
}

function strokePolygon(g: Phaser.GameObjects.Graphics, points: ScreenPoint[]): void {
  if (points.length < 2) return
  g.beginPath()
  g.moveTo(points[0]!.x, points[0]!.y)
  for (let i = 1; i < points.length; i += 1) {
    g.lineTo(points[i]!.x, points[i]!.y)
  }
  g.closePath()
  g.strokePath()
}

function strokeLine(g: Phaser.GameObjects.Graphics, from: ScreenPoint, to: ScreenPoint): void {
  g.beginPath()
  g.moveTo(from.x, from.y)
  g.lineTo(to.x, to.y)
  g.strokePath()
}
