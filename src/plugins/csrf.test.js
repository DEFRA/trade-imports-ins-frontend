import { beforeAll, afterAll, describe, expect, test } from 'vitest'

import { createServer } from '../server/server.js'
import { statusCodes } from '../server/common/constants/status-codes.js'
import { sessionAuth } from '../server/common/test-helpers/session-auth.js'
import { config } from '../config/config.js'

describe('#csrfPlugin', () => {
  let server

  beforeAll(async () => {
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

  test('Should refuse a POST to the add form with 403 when CSRF is enabled and no crumb is sent', async () => {
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

  test('Should render a hidden crumb field on the address type form', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add/address-type',
      auth: sessionAuth('csrf-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('name="crumb"')
  })
})
