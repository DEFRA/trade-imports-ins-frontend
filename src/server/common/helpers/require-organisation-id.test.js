import { describe, expect, test } from 'vitest'
import Boom from '@hapi/boom'

import { requireOrganisationId } from './require-organisation-id.js'

describe('requireOrganisationId', () => {
  test('returns organisationId when present on credentials', () => {
    const request = {
      auth: {
        credentials: {
          organisationId: '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
        }
      }
    }

    expect(requireOrganisationId(request)).toBe(
      '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
    )
  })

  test('throws forbidden when organisationId is missing', () => {
    const request = {
      auth: {
        credentials: {}
      }
    }

    expect(() => requireOrganisationId(request)).toThrow(
      'Organisation could not be identified'
    )
  })
})
