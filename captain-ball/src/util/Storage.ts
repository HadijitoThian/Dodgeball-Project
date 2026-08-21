/**
 * Storage.ts — a thin wrapper around the browser's localStorage.
 *
 * Why not just call localStorage directly? Three reasons:
 *   1. Private browsing and some Android WebViews throw when you touch it. Every
 *      call here is wrapped so a failure degrades to "no saved data" instead of
 *      crashing the game mid-match.
 *   2. Everything is namespaced under one prefix, so we never clash with
 *      anything else on the same domain.
 *   3. When Phase 2 wants real cloud saves, only this file changes.
 *
 * There is no backend in Phase 1. This is the whole persistence layer.
 */

const PREFIX = 'captainball:'

function available(): boolean {
  try {
    const probe = `${PREFIX}__probe__`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** In-memory fallback so the game still works when localStorage is blocked. */
const memory = new Map<string, string>()
const usable = typeof window !== 'undefined' && available()

export const Storage = {
  /** Read a value, parsed from JSON. Returns `fallback` if missing or corrupt. */
  get<T>(key: string, fallback: T): T {
    try {
      const raw = usable ? window.localStorage.getItem(PREFIX + key) : memory.get(PREFIX + key)
      if (raw === null || raw === undefined) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  /** Write a value as JSON. Silently does nothing if storage is unavailable. */
  set<T>(key: string, value: T): void {
    try {
      const raw = JSON.stringify(value)
      if (usable) {
        window.localStorage.setItem(PREFIX + key, raw)
      } else {
        memory.set(PREFIX + key, raw)
      }
    } catch {
      // Quota exceeded or storage disabled. Settings simply will not persist.
    }
  },

  /** Delete one saved value. */
  remove(key: string): void {
    try {
      if (usable) {
        window.localStorage.removeItem(PREFIX + key)
      } else {
        memory.delete(PREFIX + key)
      }
    } catch {
      // Nothing to do.
    }
  },

  /** True when settings will actually survive a page reload. */
  get isPersistent(): boolean {
    return usable
  },
}

/** Keys used by the game, in one place so they cannot drift apart. */
export const STORAGE_KEYS = {
  settings: 'settings',
} as const
