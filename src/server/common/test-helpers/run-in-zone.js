import { expect } from 'vitest'

export const WEST_OF_UTC = 'America/New_York'
export const EAST_OF_UTC = 'Pacific/Auckland'

export const runInZone = (zone, assertions) => {
  const originalZone = process.env.TZ
  const probeInstant = '2026-07-21T00:00:00Z'
  process.env.TZ = zone
  try {
    expect(new Date(probeInstant).getTimezoneOffset()).not.toBe(0)
    assertions()
  } finally {
    if (originalZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalZone
    }
  }
}
