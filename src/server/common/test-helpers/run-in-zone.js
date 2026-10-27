import { expect } from 'vitest'

const PROBE_INSTANT = '2026-07-21T00:00:00Z'

export const WEST_OF_UTC = 'America/New_York'
export const EAST_OF_UTC = 'Pacific/Auckland'

/**
 * Runs `assertions` with the process timezone set to `zone`, then restores `TZ`
 * exactly as it was, including leaving it unset.
 * @param {string} zone - An IANA zone name with a non-zero UTC offset.
 * @param {() => void} assertions
 */
export const runInZone = (zone, assertions) => {
  const originalZone = process.env.TZ
  process.env.TZ = zone
  try {
    expect(new Date(PROBE_INSTANT).getTimezoneOffset()).not.toBe(0)
    assertions()
  } finally {
    if (originalZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalZone
    }
  }
}
