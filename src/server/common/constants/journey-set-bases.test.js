import { describe, expect, test } from 'vitest'

import { SET_BASES } from './journey-set-bases.js'

describe('journey set bases', () => {
  test('pins every set base this service builds journey URLs under', () => {
    expect(SET_BASES).toEqual({
      LIVE_ANIMALS: '/live-animals',
      HIGH_RISK_PLANTS: '/high-risk-plants',
      GERMINAL_PRODUCTS: '/germinal-products'
    })
  })

  test('is frozen', () => {
    expect(Object.isFrozen(SET_BASES)).toBe(true)
  })
})
