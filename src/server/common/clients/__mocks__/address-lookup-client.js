import { vi } from 'vitest'

export const addressLookupClient = {
  lookupDefaultPostcode: vi.fn(),
  lookupByPostcode: vi.fn(),
  lookupByFind: vi.fn()
}
