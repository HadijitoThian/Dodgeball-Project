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
  isInBounds,
  isInRestrictedCircle,
  platformPosition,
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
