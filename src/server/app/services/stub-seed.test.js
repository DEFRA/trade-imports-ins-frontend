import { describe, expect, test } from 'vitest'

import { isEmptySeedOrganisation } from './stub-seed.js'

describe('isEmptySeedOrganisation', () => {
  test('Should be true for an organisation id ending -empty', () => {
    expect(isEmptySeedOrganisation('stub-org-dashboard-empty')).toBe(true)
  })

  test('Should be false for an organisation id not ending -empty', () => {
    expect(isEmptySeedOrganisation('stub-org-dashboard-list')).toBe(false)
  })
})
