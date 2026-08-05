import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '#/server/common/test-helpers/mock-auth.js'
import { config } from '#/config/config.js'
import { countriesClient } from '#/server/common/clients/countries-client.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))
vi.mock('#/server/common/clients/countries-client.js')

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

describe('#csrfPlugin', () => {
  let server

  beforeAll(async () => {
    vi.mocked(countriesClient.getCountries).mockResolvedValue(mockCountries)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    config.set('csrf.enabled', false)
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    config.set('csrf.enabled', false)
  })

  test('POST without crumb is rejected when csrf is enabled', async () => {
    config.set('csrf.enabled', true)

    try {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/address-book/add',
        auth: sessionAuth('csrf-post'),
        payload: {
          name: 'Test',
          addressLine1: '1 Road',
          townOrCity: 'Town',
          postcode: 'AB1 2CD',
          countryCode: 'GB',
          phone: '01234567890',
          email: 'test@example.com'
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    } finally {
      config.set('csrf.enabled', false)
    }
  })

  test('add form renders hidden crumb field on GET', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('csrf-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('name="crumb"')
  })
})
