/**
 * Tests for the rulebook data in `src/config/rules.ts`.
 *
 * The RulesEngine itself arrives in Step 4. What already exists and is worth
 * pinning down is the geometry: team composition, where the captains stand, and
 * the "your captain is at the OPPONENT's end" mirror, which is the single
 * easiest thing in this project to get backwards.
 */

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FORMATION,
  RULES,
  clampToCourt,
  confineOutfieldPlayer,
  isInBounds,
  isInRestrictedCircle,
  platformPosition,
  pushOutOfRestrictedZones,
  startingPositions,
} from '../src/config/rules'

describe('team composition', () => {
  it('fields seven players: one captain, three attackers, three defenders', () => {
    expect(RULES.team.size).toBe(7)
    expect(RULES.team.captains + RULES.team.attackers + RULES.team.defenders).toBe(
      RULES.team.size,
    )
  })

  it('has a formation slot for every player', () => {
    expect(DEFAULT_FORMATION).toHaveLength(RULES.team.size)
  })

  it('produces exactly one captain per team', () => {
    for (const team of ['north', 'south'] as const) {
      const captains = startingPositions(team).filter((p) => p.role === 'captain')
      expect(captains).toHaveLength(1)
      expect(captains[0]!.number).toBe(1)
    }
  })

  it('gives every player a unique id', () => {
    const all = [...startingPositions('north'), ...startingPositions('south')]
    expect(all).toHaveLength(14)
    expect(new Set(all.map((p) => p.id)).size).toBe(14)
  })
})

describe('captain platforms', () => {
  it("puts each captain at the OPPONENT's end of the court", () => {
    const { length } = RULES.court
    const north = platformPosition('north')
    const south = platformPosition('south')

    // North defends y = 0, so its captain must be down at the far, high-y end.
    expect(north.y).toBeGreaterThan(length / 2)
    // South defends y = length, so its captain is up at the low-y end.
    expect(south.y).toBeLessThan(length / 2)
  })

  it('sits the platforms in from the end line, not on it', () => {
    const { length } = RULES.court
    const { platformInset } = RULES.captain
    expect(platformPosition('north').y).toBeCloseTo(length - platformInset, 9)
    expect(platformPosition('south').y).toBeCloseTo(platformInset, 9)
  })

  it('centres both platforms across the court', () => {
    expect(platformPosition('north').x).toBeCloseTo(RULES.court.width / 2, 9)
    expect(platformPosition('south').x).toBeCloseTo(RULES.court.width / 2, 9)
  })

  it('starts each captain standing on their own platform', () => {
    for (const team of ['north', 'south'] as const) {
      const captain = startingPositions(team).find((p) => p.role === 'captain')!
      const platform = platformPosition(team)
      expect(captain.start.x).toBeCloseTo(platform.x, 9)
      expect(captain.start.y).toBeCloseTo(platform.y, 9)
    }
  })

  it('keeps the two platforms far enough apart to need a real pass', () => {
    const gap = Math.abs(platformPosition('north').y - platformPosition('south').y)
    expect(gap).toBeGreaterThan(RULES.court.length / 2)
  })
})

describe('starting positions', () => {
  it('places every outfield player inside the court', () => {
    for (const team of ['north', 'south'] as const) {
      for (const player of startingPositions(team)) {
        expect(isInBounds(player.start)).toBe(true)
      }
    }
  })

  it('keeps outfield players out of both restricted circles at kick-off', () => {
    for (const team of ['north', 'south'] as const) {
      for (const player of startingPositions(team)) {
        if (player.role === 'captain') continue
        expect(isInRestrictedCircle(player.start, 'north')).toBe(false)
        expect(isInRestrictedCircle(player.start, 'south')).toBe(false)
      }
    }
  })

  it('pushes attackers towards their own captain and holds defenders back', () => {
    const north = startingPositions('north')
    const captainY = platformPosition('north').y

    const attackers = north.filter((p) => p.role === 'attacker')
    const defenders = north.filter((p) => p.role === 'defender')

    const meanY = (list: typeof north) =>
      list.reduce((sum, p) => sum + p.start.y, 0) / list.length

    // North attacks towards high y, so its attackers must be nearer that end.
    expect(meanY(attackers)).toBeGreaterThan(meanY(defenders))
    expect(meanY(attackers)).toBeLessThan(captainY)
  })

  it('never spawns two players standing on top of each other', () => {
    // The two teams share one formation, mirrored. That makes it very easy to
    // pick numbers where a defender of one team spawns inside an attacker of the
    // other. Nobody should start closer than a metre and a half to anybody else.
    const all = [...startingPositions('north'), ...startingPositions('south')]

    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i]!
        const b = all[j]!
        const gap = Math.hypot(a.start.x - b.start.x, a.start.y - b.start.y)
        expect(
          gap,
          `${a.id} and ${b.id} start ${gap.toFixed(2)} m apart`,
        ).toBeGreaterThan(1.5)
      }
    }
  })

  it('starts every player in their own half, clear of the centre circle', () => {
    // Play begins from the centre spot, so nobody should be standing on it.
    const centre = RULES.court.centre
    for (const team of ['north', 'south'] as const) {
      for (const player of startingPositions(team)) {
        const gap = Math.hypot(player.start.x - centre.x, player.start.y - centre.y)
        expect(gap, `${player.id} is on the centre spot`).toBeGreaterThan(1.8)
      }
    }
  })

  it('mirrors the two teams across the halfway line', () => {
    const north = startingPositions('north')
    const south = startingPositions('south')
    const { length } = RULES.court

    for (let i = 0; i < north.length; i += 1) {
      expect(north[i]!.start.x).toBeCloseTo(south[i]!.start.x, 9)
      expect(north[i]!.start.y).toBeCloseTo(length - south[i]!.start.y, 9)
    }
  })
})

describe('restricted circle', () => {
  it('includes the platform centre and excludes a point outside the radius', () => {
    const platform = platformPosition('north')
    const { restrictedRadius } = RULES.captain

    expect(isInRestrictedCircle(platform, 'north')).toBe(true)
    expect(
      isInRestrictedCircle({ x: platform.x, y: platform.y - restrictedRadius + 0.1 }, 'north'),
    ).toBe(true)
    expect(
      isInRestrictedCircle({ x: platform.x, y: platform.y - restrictedRadius - 0.1 }, 'north'),
    ).toBe(false)
  })

  it('does not overlap the halfway line', () => {
    const { length } = RULES.court
    expect(isInRestrictedCircle({ x: RULES.court.width / 2, y: length / 2 }, 'north')).toBe(false)
    expect(isInRestrictedCircle({ x: RULES.court.width / 2, y: length / 2 }, 'south')).toBe(false)
  })
})

describe('in bounds', () => {
  it('accepts points on the lines and rejects points past them', () => {
    const { width, length } = RULES.court
    expect(isInBounds({ x: 0, y: 0 })).toBe(true)
    expect(isInBounds({ x: width, y: length })).toBe(true)
    expect(isInBounds({ x: -0.01, y: 5 })).toBe(false)
    expect(isInBounds({ x: 5, y: length + 0.01 })).toBe(false)
  })
})

describe('match settings', () => {
  it('defaults to two five-minute halves with a seven-second pass window', () => {
    expect(RULES.match.halves).toBe(2)
    expect(RULES.match.halfLengthSeconds).toBe(300)
    expect(RULES.possession.passWindowSeconds).toBe(7)
  })

  it('never allows dribbling, and allows at most a couple of landing steps', () => {
    expect(RULES.possession.dribbleAllowed).toBe(false)
    expect(RULES.possession.maxSteps).toBeGreaterThanOrEqual(0)
    expect(RULES.possession.maxSteps).toBeLessThanOrEqual(2)
  })

  it('breaks a tie with sudden death', () => {
    expect(RULES.match.tieBreaker).toBe('sudden-death')
  })
})

describe('clampToCourt', () => {
  it('leaves a point that is already inside alone', () => {
    const inside = { x: 5, y: 9 }
    expect(clampToCourt(inside)).toEqual(inside)
  })

  it('pulls a point back over each line it has crossed', () => {
    const { width, length } = RULES.court
    expect(clampToCourt({ x: -4, y: 9 })).toEqual({ x: 0, y: 9 })
    expect(clampToCourt({ x: width + 4, y: 9 })).toEqual({ x: width, y: 9 })
    expect(clampToCourt({ x: 5, y: -4 })).toEqual({ x: 5, y: 0 })
    expect(clampToCourt({ x: 5, y: length + 4 })).toEqual({ x: 5, y: length })
  })

  it('handles a corner, where two lines are crossed at once', () => {
    expect(clampToCourt({ x: -9, y: -9 })).toEqual({ x: 0, y: 0 })
  })

  it('keeps a body radius clear of the line', () => {
    const clamped = clampToCourt({ x: -4, y: 9 }, 0.4)
    expect(clamped.x).toBeCloseTo(0.4, 9)
  })

  it('does not modify the point it was given', () => {
    const original = { x: -4, y: 9 }
    clampToCourt(original)
    expect(original).toEqual({ x: -4, y: 9 })
  })
})

describe('pushOutOfRestrictedZones', () => {
  it('leaves a point out in open play alone', () => {
    const midfield = RULES.court.centre
    expect(pushOutOfRestrictedZones(midfield)).toEqual(midfield)
  })

  it('pushes a point that has strayed inside out to the edge of the circle', () => {
    const platform = platformPosition('north')
    // Just inside, on the side players approach from.
    const inside = { x: platform.x, y: platform.y - 0.5 }

    const pushed = pushOutOfRestrictedZones(inside)
    const distance = Math.hypot(pushed.x - platform.x, pushed.y - platform.y)

    expect(distance).toBeCloseTo(RULES.captain.restrictedRadius, 9)
    // Straight back the way it came, so a player slides off rather than jumping.
    expect(pushed.x).toBeCloseTo(inside.x, 9)
  })

  it('takes the shortest way out, sideways when that is nearer', () => {
    const platform = platformPosition('south')
    // Deep behind the platform and off to one side: leaving forwards would be a
    // long way round, so the nearest exit is out to the side.
    const inside = { x: platform.x - 1.6, y: 0.6 }

    const pushed = pushOutOfRestrictedZones(inside)

    expect(pushed.y).toBeCloseTo(inside.y, 9)
    expect(pushed.x).toBeCloseTo(platform.x - RULES.captain.restrictedRadius, 9)
  })

  it('never leaves a player inside the circle, from anywhere on the court', () => {
    const { width, length } = RULES.court
    for (let x = -1; x <= width + 1; x += 0.25) {
      for (let y = -1; y <= length + 1; y += 0.25) {
        const pushed = pushOutOfRestrictedZones({ x, y })
        for (const team of ['north', 'south'] as const) {
          const platform = platformPosition(team)
          const distance = Math.hypot(pushed.x - platform.x, pushed.y - platform.y)
          expect(distance).toBeGreaterThanOrEqual(RULES.captain.restrictedRadius - 1e-9)
        }
      }
    }
  })

  it('has an answer even for a point exactly on the platform centre', () => {
    const platform = platformPosition('north')
    const pushed = pushOutOfRestrictedZones({ ...platform })
    const distance = Math.hypot(pushed.x - platform.x, pushed.y - platform.y)
    expect(distance).toBeCloseTo(RULES.captain.restrictedRadius, 9)
  })

  it('adds the requested margin on top of the radius', () => {
    const platform = platformPosition('north')
    const pushed = pushOutOfRestrictedZones({ x: platform.x, y: platform.y - 0.5 }, 0.4)
    const distance = Math.hypot(pushed.x - platform.x, pushed.y - platform.y)
    expect(distance).toBeCloseTo(RULES.captain.restrictedRadius + 0.4, 9)
  })

  it('blocks the dead strip behind the platform, which is too narrow to stand in', () => {
    const platform = platformPosition('south')
    // Directly behind the captain, outside the circle but with no room for a body.
    const behind = { x: platform.x, y: 0.2 }
    const pushed = pushOutOfRestrictedZones(behind, 0.4)

    expect(pushed).not.toEqual(behind)
    // And wherever it moved them, they are still on the court.
    expect(isInBounds(pushed)).toBe(true)
  })
})

describe('confineOutfieldPlayer', () => {
  it('keeps a player somewhere legal no matter where they try to walk', () => {
    const { width, length } = RULES.court
    const radius = 0.4

    // Walk a dense grid over and well past the court, including both circles.
    for (let x = -3; x <= width + 3; x += 0.5) {
      for (let y = -3; y <= length + 3; y += 0.5) {
        const safe = confineOutfieldPlayer({ x, y }, radius)

        expect(safe.x).toBeGreaterThanOrEqual(radius - 1e-9)
        expect(safe.x).toBeLessThanOrEqual(width - radius + 1e-9)
        expect(safe.y).toBeGreaterThanOrEqual(radius - 1e-9)
        expect(safe.y).toBeLessThanOrEqual(length - radius + 1e-9)

        for (const team of ['north', 'south'] as const) {
          const platform = platformPosition(team)
          const distance = Math.hypot(safe.x - platform.x, safe.y - platform.y)
          expect(
            distance,
            `walking to (${x}, ${y}) ended up ${distance.toFixed(3)} m from the ${team} platform`,
          ).toBeGreaterThanOrEqual(RULES.captain.restrictedRadius - 1e-9)
        }
      }
    }
  })

  it('does not move a player who is standing somewhere perfectly legal', () => {
    const spot = { x: 3, y: 11 }
    expect(confineOutfieldPlayer(spot, 0.4)).toEqual(spot)
  })
})
