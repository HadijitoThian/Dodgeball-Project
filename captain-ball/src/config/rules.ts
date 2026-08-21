/**
 * rules.ts — EVERY rule of captain ball, as plain data.
 *
 * Nothing in here is code logic: it is the rulebook. If you want a longer half,
 * a bigger court, or a stricter travel rule, change the number here and the whole
 * game follows. The systems in `src/systems/` read these values, they never
 * hard-code their own.
 *
 * All distances are in METRES on the flat "court coordinate" system:
 *   x = across the court (0 = left touchline, `court.width` = right touchline)
 *   y = along the court  (0 = north end line, `court.length` = south end line)
 *   z = height off the floor (only the ball and the captain's platform use it)
 *
 * Screen pixels never appear in this file. `src/iso/projection.ts` does that job.
 */

/**
 * The two sides.
 * `north` defends the north end line (y = 0) and attacks the south end, because
 * the north team's own captain stands on a stool down at the south end.
 * `south` is the mirror image.
 */
export type TeamId = 'north' | 'south'

/** A player's job. Drives both starting position and (from Step 5) AI behaviour. */
export type Role = 'captain' | 'attacker' | 'defender'

/** A point on the court, in metres. */
export interface CourtPoint {
  x: number
  y: number
}

export const RULES = {
  /** Court dimensions. A rectangular indoor court, roughly badminton-doubles sized. */
  court: {
    /** Touchline to touchline, across. */
    width: 12,
    /** End line to end line, along. */
    length: 20,
    /** Painted run-off outside the lines. Purely cosmetic — not playable. */
    surround: 2,
    /** Halfway line, used for the restart after a score. */
    get centre(): CourtPoint {
      return { x: RULES.court.width / 2, y: RULES.court.length / 2 }
    },
  },

  /** Team composition. 7 players: 1 captain + 3 attackers + 3 defenders. */
  team: {
    size: 7,
    attackers: 3,
    defenders: 3,
    /** One captain per team, always. Here for completeness, do not change. */
    captains: 1,
  },

  /**
   * The captain's platform (the "stool") and the restricted circle around it.
   *
   * IMPORTANT and easy to get backwards: a team's captain stands at the
   * OPPONENT'S end of the court. The north team attacks towards y = 0 because
   * that is where their own captain is standing.
   */
  captain: {
    /** How far the platform sits in from the end line behind it, in metres. */
    platformInset: 2.5,
    /** Height of the stool. Raises the captain's catch point off the floor. */
    platformHeight: 0.5,
    /** Radius of the no-go circle around the platform, in metres. */
    restrictedRadius: 2,
    /** How close to the platform a pass must arrive to count as a clean catch. */
    catchRadius: 1.1,
    /** The captain may shuffle this far either side of platform centre. */
    platformSlack: 0.35,
  },

  /** Possession rules: the shot clock and the no-travelling rule. */
  possession: {
    /**
     * The 7-second rule. The ball carrier must release a pass within this many
     * seconds or possession turns over to the other team.
     *
     * (Your brief mentioned "3-second" once in the file list and "7 seconds"
     * twice in the rules. 7 is the rule; set this to 3 for the faster variant.)
     */
    passWindowSeconds: 7,
    /**
     * Landing steps allowed when catching on the move.
     *   0 = strict: plant immediately, pivot only
     *   1 = default: one settling step, then pivot only
     *   2 = looser house rule
     */
    maxSteps: 1,
    /** How far one "step" is, in metres. Used to measure the travel allowance. */
    stepDistance: 0.75,
    /** No dribbling, ever. Here so the rule is written down, not assumed. */
    dribbleAllowed: false,
    /** Radius the planted pivot foot allows the body to rotate around. */
    pivotRadius: 0.45,
  },

  /** Fouls and restarts. */
  fouls: {
    /**
     * No contact. If two opposing players get closer than this while one holds
     * the ball, that is a push/bump → foul.
     */
    contactRadius: 0.55,
    /** A free pass is taken from the spot of the foul. */
    freePassFromSpot: true,
    /** Opponents must retreat this far from a free pass or throw-in. */
    freePassClearance: 2,
    /** Seconds the taker has to restart a free pass or throw-in. */
    restartWindowSeconds: 5,
  },

  /** What happens when the ball leaves the court or a goal is scored. */
  restarts: {
    /** Out of bounds → throw-in to the team that did NOT touch it last. */
    outOfBoundsToLastUntouched: true,
    /** After a score, play restarts from the centre with the conceding team. */
    scoreRestartAtCentre: true,
    /** How far in from the sideline a throw-in is taken. */
    throwInInset: 0.5,
  },

  /** Scoring. */
  scoring: {
    /** A clean catch by your own captain, on the platform, is worth this much. */
    pointsPerCatch: 1,
  },

  /** Match length and how a tie is broken. */
  match: {
    halves: 2,
    /** 5 minutes per half by default. Configurable from the settings menu later. */
    halfLengthSeconds: 300,
    /** Break between halves. Teams swap ends. */
    halfTimeSeconds: 30,
    /** Tie at full time → sudden-death overtime: first score wins. */
    tieBreaker: 'sudden-death' as const,
    /** Safety cap so sudden death cannot run forever. 0 = no cap. */
    overtimeCapSeconds: 180,
    /** Teams change ends at half time. */
    swapEndsAtHalfTime: true,
  },
} as const

/**
 * The default formation, written as fractions of the court so it survives any
 * change to `court.width` / `court.length`.
 *
 * `across` = 0 is the left touchline, 1 is the right touchline.
 * `along`  = 0 is your OWN end line, 1 is the opponent's end line. Mirroring for
 * the other team is handled by `startingPositions()` below, so you only describe
 * one team here.
 */
export interface FormationSlot {
  role: Role
  across: number
  along: number
}

export const DEFAULT_FORMATION: readonly FormationSlot[] = [
  // The captain stands at the far end — the opponent's end — on the stool.
  { role: 'captain', across: 0.5, along: 1.0 },

  // Three attackers push up towards their own captain, the middle one furthest
  // forward so the front line is staggered rather than flat.
  { role: 'attacker', across: 0.2, along: 0.58 },
  { role: 'attacker', across: 0.5, along: 0.64 },
  { role: 'attacker', across: 0.8, along: 0.58 },

  // Three defenders screen the opposing captain's circle. Two constraints shape
  // these numbers, and both are easy to break by accident:
  //   1. They must start OUTSIDE the restricted circle. With a 2 m circle 2.5 m
  //      in from the end line, anything below `along` 0.23 is already a foul.
  //   2. Because the two teams use the same formation mirrored, a defender's
  //      `along` must not land on `1 - (an attacker's along)` at the same
  //      `across`, or the two teams spawn standing inside each other.
  { role: 'defender', across: 0.28, along: 0.32 },
  { role: 'defender', across: 0.5, along: 0.28 },
  { role: 'defender', across: 0.72, along: 0.32 },
] as const

/** A player as the rules describe them, before any rendering is involved. */
export interface PlayerSpec {
  id: string
  team: TeamId
  role: Role
  /** Shirt number, 1-7. The captain always wears 1. */
  number: number
  start: CourtPoint
}

/**
 * Turn the formation into concrete court positions for one team.
 *
 * The north team defends y = 0 and attacks towards... y = 0 as well, because its
 * captain stands there. So "along = 1" for the north team means LOW y, and for
 * the south team means HIGH y. That single mirror is the only asymmetry.
 */
export function startingPositions(team: TeamId): PlayerSpec[] {
  const { width, length } = RULES.court
  const { platformInset } = RULES.captain

  return DEFAULT_FORMATION.map((slot, index) => {
    const x = slot.across * width

    // Distance from this team's OWN end line, measured towards the far end.
    let fromOwnEnd = slot.along * length

    // The captain does not sit on the end line itself — they sit on a stool
    // `platformInset` metres in from it.
    if (slot.role === 'captain') {
      fromOwnEnd = length - platformInset
    }

    // The north team's own end line is y = 0, so "distance from own end" reads
    // straight off as y. The south team's own end line is y = length, so the same
    // distance has to be mirrored. That single flip is the only asymmetry here.
    const y = team === 'north' ? fromOwnEnd : length - fromOwnEnd

    return {
      id: `${team}-${slot.role}-${index}`,
      team,
      role: slot.role,
      number: slot.role === 'captain' ? 1 : index + 1,
      start: { x, y },
    }
  })
}

/** Where a team's captain platform sits. Their captain never leaves it. */
export function platformPosition(team: TeamId): CourtPoint {
  const { width, length } = RULES.court
  const { platformInset } = RULES.captain
  return {
    x: width / 2,
    y: team === 'north' ? length - platformInset : platformInset,
  }
}

/** Is this court point inside the given team's restricted circle? */
export function isInRestrictedCircle(point: CourtPoint, team: TeamId): boolean {
  const platform = platformPosition(team)
  const dx = point.x - platform.x
  const dy = point.y - platform.y
  return Math.hypot(dx, dy) <= RULES.captain.restrictedRadius
}

/** Is this court point inside the playing area (touchlines and end lines)? */
export function isInBounds(point: CourtPoint): boolean {
  const { width, length } = RULES.court
  return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= length
}
