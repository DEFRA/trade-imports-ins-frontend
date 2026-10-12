import { describe, expect, test } from 'vitest'

import { SET_BASES } from './journey-set-bases.js'

describe('journey set bases', () => {
  test('pins the live-animals set base the journey frontend mounts under', () => {
    expect(SET_BASES.LIVE_ANIMALS).toBe('/live-animals')
  })

  test('pins the germinal products set base the animals frontend will mount under', () => {
    expect(SET_BASES.GERMINAL_PRODUCTS).toBe('/germinal-products')
  })

  test('pins the high-risk plants set base the plants frontend mounts under', () => {
    expect(SET_BASES.HIGH_RISK_PLANTS).toBe('/high-risk-plants')
  })

  test('is frozen, so a link builder cannot reshape the shared fact', () => {
    expect(Object.isFrozen(SET_BASES)).toBe(true)
  })
})
