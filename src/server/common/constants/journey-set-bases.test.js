import { describe, expect, test } from 'vitest'

import { SET_BASES } from './journey-set-bases.js'

describe('journey set bases', () => {
  test('pins the live-animals set base the journey frontend mounts under', () => {
    expect(SET_BASES.LIVE_ANIMALS).toBe('/live-animals')
  })

  test('is frozen, so a link builder cannot reshape the shared fact', () => {
    expect(Object.isFrozen(SET_BASES)).toBe(true)
  })
})
