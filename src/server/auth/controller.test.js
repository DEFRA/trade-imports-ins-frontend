import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '#/server/common/test-helpers/mock-auth.js'
import { verifyToken } from '#/auth/verify-token.js'
import { getPermissions } from '#/auth/get-permissions.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))
vi.mock('#/auth/get-sign-out-url.js', () => ({
  getSignOutUrl: vi.fn().mockResolvedValue('/signed-out')
}))
vi.mock('#/auth/verify-token.js', () => ({
  verifyToken: vi.fn()
}))
vi.mock('#/auth/get-permissions.js', () => ({
  getPermissions: vi.fn()
}))

const defraIdAuth = (profileOverrides = {}) => ({
  strategy: 'defra-id',
  credentials: {
    profile: {
      sessionId: 'signin-oidc-session',
      crn: 'CRN123',
      organisationId: 'org-1',
      firstName: 'Test',
      lastName: 'User',
      ...profileOverrides
    },
    token: 'mock-token',
    refreshToken: 'mock-refresh-token'
  }
})

describe('#authController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
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

  test('GET /auth/sign-in-oidc renders unauthorised when organisationId is missing', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: defraIdAuth({ organisationId: undefined })
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Sorry, we are unable to sign you in')
    expect(verifyToken).not.toHaveBeenCalled()
    expect(getPermissions).not.toHaveBeenCalled()
  })

  test('GET /auth/sign-in-oidc renders unauthorised when getPermissions fails', async () => {
    verifyToken.mockResolvedValue(undefined)
    getPermissions.mockRejectedValue(new Error('Permissions API unavailable'))

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: defraIdAuth()
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Sorry, we are unable to sign you in')
    expect(verifyToken).toHaveBeenCalledWith('mock-token')
    expect(getPermissions).toHaveBeenCalledWith('CRN123', 'org-1', 'mock-token')
  })
})
