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

describe('#authController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /auth/sign-in redirects to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in',
      auth: {
        strategy: 'defra-id',
        credentials: {}
      }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out-oidc redirects unauthenticated users to sign-out URL', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/signed-out')
  })

  test('GET /auth/sign-out-oidc clears authenticated session and redirects', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc',
      auth: sessionAuth('signout-oidc-authenticated')
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/signed-out')
  })
})
