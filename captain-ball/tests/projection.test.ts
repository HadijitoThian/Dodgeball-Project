/**
 * Tests for the isometric maths.
 *
 * These are the numbers everything visual depends on, and they are pure
 * functions with no browser involved — exactly the kind of thing worth testing.
 * Rendering itself is deliberately not tested.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import {
  centreCourt,
  courtDistance,
  depthFor,
  getOrigin,
  getScale,
  isoToScreen,
  resetProjection,
  screenToIso,
  screenVectorToCourt,
  setOrigin,
  setScale,
} from '../src/iso/projection'

const CLOSE = 1e-9

beforeEach(() => {
  resetProjection()
})

describe('isoToScreen', () => {
  it('puts court (0,0) exactly on the origin', () => {
    setOrigin(400, 120)
    expect(isoToScreen({ x: 0, y: 0 })).toEqual({ x: 400, y: 120 })
  })

  it('moves right and down as x increases', () => {
    const a = isoToScreen({ x: 0, y: 0 })
    const b = isoToScreen({ x: 1, y: 0 })
    expect(b.x).toBeGreaterThan(a.x)
    expect(b.y).toBeGreaterThan(a.y)
  })

  it('moves left and down as y increases', () => {
    const a = isoToScreen({ x: 0, y: 0 })
    const b = isoToScreen({ x: 0, y: 1 })
    expect(b.x).toBeLessThan(a.x)
    expect(b.y).toBeGreaterThan(a.y)
  })

  it('lifts a point up the screen as height increases', () => {
    const ground = isoToScreen({ x: 3, y: 4, z: 0 })
    const air = isoToScreen({ x: 3, y: 4, z: 2 })
    expect(air.x).toBe(ground.x)
    expect(air.y).toBeLessThan(ground.y)
    expect(ground.y - air.y).toBeCloseTo(2 * getScale().height, 9)
  })

  it('keeps the 2:1 diamond shape', () => {
    const scale = getScale()
    expect(scale.halfWidth).toBeCloseTo(scale.halfHeight * 2, 9)
  })
})

describe('screenToIso', () => {
  it('is the exact inverse of isoToScreen for points on the floor', () => {
    setOrigin(480, 90)
    const samples = [
      { x: 0, y: 0 },
      { x: 6, y: 10 },
      { x: 12, y: 20 },
      { x: 3.25, y: 17.75 },
      { x: -2, y: 22 },
    ]

    for (const point of samples) {
      const round = screenToIso(isoToScreen(point))
      expect(Math.abs(round.x - point.x)).toBeLessThan(CLOSE)
      expect(Math.abs(round.y - point.y)).toBeLessThan(CLOSE)
    }
  })

  it('survives a change of zoom', () => {
    setScale({ halfWidth: 40, halfHeight: 20, height: 30 })
    setOrigin(100, 50)
    const point = { x: 7.5, y: 13.25 }
    const round = screenToIso(isoToScreen(point))
    expect(round.x).toBeCloseTo(point.x, 9)
    expect(round.y).toBeCloseTo(point.y, 9)
  })

  it('ignores height, always returning the floor point', () => {
    setOrigin(0, 0)
    const floor = screenToIso(isoToScreen({ x: 4, y: 4, z: 0 }))
    expect(floor.x).toBeCloseTo(4, 9)
    expect(floor.y).toBeCloseTo(4, 9)
  })
})

describe('depthFor', () => {
  it('sorts players further down the court in front', () => {
    const back = depthFor({ x: 2, y: 2 })
    const front = depthFor({ x: 2, y: 9 })
    expect(front).toBeGreaterThan(back)
  })

  it('treats the two court axes as equally near the camera', () => {
    expect(depthFor({ x: 5, y: 1 })).toBeCloseTo(depthFor({ x: 1, y: 5 }), 9)
  })

  it('draws a ball above a player in front of them', () => {
    const player = depthFor({ x: 6, y: 6, z: 0 })
    const ballOverhead = depthFor({ x: 6, y: 6, z: 2 })
    expect(ballOverhead).toBeGreaterThan(player)
  })
})

describe('centreCourt', () => {
  it('centres the court diamond horizontally in the canvas', () => {
    centreCourt(960, 540, 12, 20)

    const left = isoToScreen({ x: 0, y: 20 })
    const right = isoToScreen({ x: 12, y: 0 })
    expect(left.x).toBeCloseTo(960 - right.x, 6)
  })

  it('keeps the whole court inside a 960x540 canvas', () => {
    centreCourt(960, 540, 12, 20, { top: 52, bottom: 18 })

    const corners = [
      isoToScreen({ x: 0, y: 0 }),
      isoToScreen({ x: 12, y: 0 }),
      isoToScreen({ x: 12, y: 20 }),
      isoToScreen({ x: 0, y: 20 }),
    ]

    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(0)
      expect(corner.x).toBeLessThanOrEqual(960)
      expect(corner.y).toBeGreaterThanOrEqual(52)
      expect(corner.y).toBeLessThanOrEqual(540 - 18)
    }
  })

  it('respects the space reserved for the HUD', () => {
    centreCourt(960, 540, 12, 20, { top: 52, bottom: 18 })
    const withHud = getOrigin().y

    resetProjection()
    centreCourt(960, 540, 12, 20)
    const withoutHud = getOrigin().y

    expect(withHud).toBeGreaterThan(withoutHud)
  })
})

describe('courtDistance', () => {
  it('measures a straight line in metres', () => {
    expect(courtDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 9)
  })

  it('is zero for the same point', () => {
    expect(courtDistance({ x: 6, y: 10 }, { x: 6, y: 10 })).toBe(0)
  })
})

describe('screenVectorToCourt', () => {
  it('returns zero for no input', () => {
    expect(screenVectorToCourt(0, 0)).toEqual({ x: 0, y: 0 })
  })

  it('always returns a direction of length one', () => {
    const samples: Array<[number, number]> = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [1, -1],
      [-3, 7],
      [0.2, 0.03],
    ]
    for (const [sx, sy] of samples) {
      const direction = screenVectorToCourt(sx, sy)
      expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 9)
    }
  })

  it('sends "up the screen" towards the top corner of the court', () => {
    // Pressing W means "go up". On a 2:1 isometric court, up the screen is the
    // diagonal towards court (0, 0), so x and y must decrease together.
    const up = screenVectorToCourt(0, -1)
    expect(up.x).toBeLessThan(0)
    expect(up.y).toBeLessThan(0)
    expect(up.x).toBeCloseTo(up.y, 9)
  })

  it('sends "down the screen" the exact opposite way', () => {
    const up = screenVectorToCourt(0, -1)
    const down = screenVectorToCourt(0, 1)
    expect(down.x).toBeCloseTo(-up.x, 9)
    expect(down.y).toBeCloseTo(-up.y, 9)
  })

  it('sends "right on screen" along the court\'s increasing-x diagonal', () => {
    const right = screenVectorToCourt(1, 0)
    expect(right.x).toBeGreaterThan(0)
    expect(right.y).toBeLessThan(0)
    expect(right.x).toBeCloseTo(-right.y, 9)
  })

  it('agrees with isoToScreen: moving the returned way really does go that way', () => {
    setOrigin(480, 90)
    const start = { x: 6, y: 10 }
    const startScreen = isoToScreen(start)

    // Push "up the screen" and confirm the player actually rises on screen.
    const up = screenVectorToCourt(0, -1)
    const movedScreen = isoToScreen({ x: start.x + up.x, y: start.y + up.y })
    expect(movedScreen.y).toBeLessThan(startScreen.y)
    expect(movedScreen.x).toBeCloseTo(startScreen.x, 6)
  })

  it('ignores the length of the input, only the direction', () => {
    const small = screenVectorToCourt(0.01, -0.01)
    const large = screenVectorToCourt(100, -100)
    expect(small.x).toBeCloseTo(large.x, 9)
    expect(small.y).toBeCloseTo(large.y, 9)
  })
})
