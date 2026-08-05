import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '#/server/common/test-helpers/mock-auth.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('#/auth/get-sign-out-url.js', () => ({
  getSignOutUrl: vi.fn().mockResolvedValue('/signed-out')
}))

describe('GET /signout', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('clears auth cookies before redirecting to the IdP sign-out URL', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/signout',
      auth: sessionAuth('signout-session')
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/signed-out')

    const setCookie = headers['set-cookie'] ?? []
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
    const joinedCookies = cookies.join('\n')

    expect(joinedCookies).toContain('sid=')
  })
})
