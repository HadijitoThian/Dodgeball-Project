/**
 * balance.ts — how the game FEELS, as opposed to what the rules ARE.
 *
 * `rules.ts` holds things a referee would recognise. This file holds the dials
 * you turn to make the game fun: how fast players run, how hard the AI is, how
 * often a computer player fumbles. Nothing here changes who wins legally — it
 * only changes how hard it is to win.
 *
 * Speeds are metres per second unless noted.
 */

/** The three difficulty settings offered in the menu. */
export type Difficulty = 'easy' | 'medium' | 'hard'

/** Movement feel for a human-controlled or AI player. */
export const MOVEMENT = {
  /** Normal jog speed. */
  walkSpeed: 4.2,
  /** Speed while holding sprint. */
  sprintSpeed: 6.4,
  /** How quickly a player reaches top speed. Higher = twitchier. */
  acceleration: 26,
  /** How quickly a player stops when input is released. */
  deceleration: 34,
  /** Seconds of sprint available before it runs out. 0 = unlimited. */
  sprintStamina: 3.5,
  /** Seconds to refill sprint stamina from empty. */
  sprintRecovery: 5,
} as const

/** How the ball behaves in flight. */
export const BALL = {
  /** Speed of a normal pass. */
  passSpeed: 12,
  /** Speed of a fully charged pass. */
  maxPassSpeed: 18,
  /** Seconds of holding the pass button to reach `maxPassSpeed`. */
  chargeTime: 0.8,
  /** How high a pass arcs at its peak, in metres. */
  arcHeight: 1.6,
  /** Radius within which a player can claim a loose or arriving ball. */
  catchRadius: 0.9,
  /** Radius within which a defender can pick a pass off. */
  interceptRadius: 0.7,
  /** Seconds after a catch before that player can pass again. */
  releaseCooldown: 0.15,
  /** How quickly a loose ball on the floor slows down. */
  groundFriction: 6,
} as const

/** One difficulty preset. Every AI number lives in here. */
export interface DifficultyProfile {
  label: string
  /** AI movement speed as a fraction of `MOVEMENT.walkSpeed`. */
  speedFactor: number
  /** Seconds an AI takes to notice and react to a change. Lower = sharper. */
  reactionTime: number
  /** 0-1 chance an AI pass goes exactly where it was aimed. */
  passAccuracy: number
  /** 0-1 chance an AI drops a catchable ball. */
  dropChance: number
  /** 0-1 chance an AI defender reads a pass and goes for the interception. */
  interceptAwareness: number
  /** How tightly a defender sticks to the attacker they are marking, in metres. */
  markingDistance: number
  /** Seconds an AI holds the ball before passing. Must stay under the 7s rule. */
  decisionDelay: number
  /** 0-1 chance an AI commits a contact foul while defending. */
  foulChance: number
}

export const DIFFICULTY: Record<Difficulty, DifficultyProfile> = {
  easy: {
    label: 'Easy',
    speedFactor: 0.82,
    reactionTime: 0.55,
    passAccuracy: 0.72,
    dropChance: 0.22,
    interceptAwareness: 0.3,
    markingDistance: 2.6,
    decisionDelay: 2.4,
    foulChance: 0.06,
  },
  medium: {
    label: 'Medium',
    speedFactor: 0.94,
    reactionTime: 0.32,
    passAccuracy: 0.86,
    dropChance: 0.1,
    interceptAwareness: 0.58,
    markingDistance: 1.8,
    decisionDelay: 1.5,
    foulChance: 0.03,
  },
  hard: {
    label: 'Hard',
    speedFactor: 1,
    reactionTime: 0.16,
    passAccuracy: 0.95,
    dropChance: 0.04,
    interceptAwareness: 0.82,
    markingDistance: 1.15,
    decisionDelay: 0.9,
    foulChance: 0.015,
  },
}

/** The difficulty a brand-new player gets. */
export const DEFAULT_DIFFICULTY: Difficulty = 'medium'

/** Team colours. Index 0 is the player's team by default. */
export const TEAM_COLOURS = {
  north: { primary: 0x3d8bfd, secondary: 0x0b2d63, name: 'Blue' },
  south: { primary: 0xff5a5f, secondary: 0x6b1418, name: 'Red' },
} as const
