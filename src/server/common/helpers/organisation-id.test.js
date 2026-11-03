import { describe, expect, test } from 'vitest'

import { ORGANISATION_ID } from '../test-helpers/session-auth.js'
import { organisationIdOf } from './organisation-id.js'

describe('#organisationIdOf', () => {
  test('Should read the organisation from the verified session credentials', () => {
    const request = {
      auth: {
        credentials: {
          organisationId: ORGANISATION_ID
        }
      }
    }

    expect(organisationIdOf(request)).toBe(ORGANISATION_ID)
  })

  test('Should be undefined for a request that carries no organisation', () => {
    expect(organisationIdOf({ auth: { credentials: {} } })).toBeUndefined()
    expect(organisationIdOf({})).toBeUndefined()
    expect(organisationIdOf(undefined)).toBeUndefined()
  })
})
