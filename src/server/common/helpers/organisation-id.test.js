import { describe, expect, test } from 'vitest'

import { organisationIdOf } from './organisation-id.js'

describe('#organisationIdOf', () => {
  test('Should read the organisation from the verified session credentials', () => {
    const request = {
      auth: {
        credentials: {
          organisationId: '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
        }
      }
    }

    expect(organisationIdOf(request)).toBe(
      '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
    )
  })

  test('Should be undefined for a request that carries no organisation', () => {
    expect(organisationIdOf({ auth: { credentials: {} } })).toBeUndefined()
    expect(organisationIdOf({})).toBeUndefined()
    expect(organisationIdOf(undefined)).toBeUndefined()
  })
})
