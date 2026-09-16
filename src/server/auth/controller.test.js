import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { createServer } from '../server.js'
import { config } from '../../config/config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../common/test-helpers/mock-auth.js'
import { verifyToken } from '../../auth/verify-token.js'
import { getPermissions } from '../../auth/get-permissions.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))
vi.mock('../../auth/get-sign-out-url.js', () => ({
  getSignOutUrl: vi.fn().mockResolvedValue('/signed-out')
}))
vi.mock('../../auth/verify-token.js', () => ({
  verifyToken: vi.fn()
}))
vi.mock('../../auth/get-permissions.js', () => ({
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

const expectSessionCookieCleared = (headers) => {
  const setCookie = headers['set-cookie'] ?? []
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  expect(cookies.join('\n')).toContain('sid=')
}

describe('#authController', () => {
  const originalMode = config.get('stubMode')
  let server

  beforeAll(async () => {
    config.set('stubMode', false)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    config.set('stubMode', originalMode)
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

  test('GET /auth/sign-out drops the session and redirects authenticated users to the sign-out URL', async () => {
    const sessionId = 'signout-authenticated'
    await server.app.cache.set(sessionId, { sessionId, token: 'mock-token' })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/signed-out')
    expect(await server.app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })

  test('GET /auth/sign-out-oidc redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out-oidc clears authenticated session and redirects', async () => {
    const sessionId = 'signout-oidc-authenticated'
    await server.app.cache.set(sessionId, { sessionId, token: 'mock-token' })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/signed-out')
    expect(await server.app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
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

  test('GET /auth/sign-in-oidc renders unauthorised when token verification fails', async () => {
    verifyToken.mockRejectedValue(new Error('Client request timeout'))

    const { statusCode, payload, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: defraIdAuth()
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain('Sorry, we are unable to sign you in')
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
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
