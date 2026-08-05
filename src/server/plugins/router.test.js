import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#router auth gating', () => {
  let server

  beforeAll(async () => {
    config.set('auth.enabled', false)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    config.set('auth.enabled', true)
    await server.stop({ timeout: 0 })
  })

  test('address-book routes are not registered when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('health remains available when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(statusCode).toBe(statusCodes.ok)
  })
})
