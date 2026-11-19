import Jwt from '@hapi/jwt'
import nock from 'nock'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import {
  hiddenIdmSignInProvider,
  providerSettingKey,
  serviceSignInProvider
} from '../auth/identity-providers.js'
import { config } from '../config/config.js'
import { statusCodes } from '../server/common/constants/status-codes.js'
import {
  configureIdm,
  idmDiscoveryDocument
} from '../server/common/test-helpers/idm-sign-in-settings.js'
import { mockOidcConfig } from '../server/common/test-helpers/mock-oidc-config.js'
import {
  runInRealMode,
  runInStubMode
} from '../server/common/test-helpers/real-mode.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import {
  discoveryUrlRequest,
  runAgainstServedOidcDiscovery,
  serveOidcDiscovery
} from '../server/common/test-helpers/serve-oidc-discovery.js'
import {
  startRealModeServer,
  startServerPastDiscoveryRetries,
  startTestServer,
  stopTestServer
} from '../server/common/test-helpers/test-server.js'
import { getBellOptions, getCookieOptions } from './auth.js'

vi.mock('../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../server/common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

const AUTH_COOKIE_NAME = 'test-auth-cookie'
const PROTECTED_PAGE = '/address-book?page=2'
const SIGN_IN_FOR_PROTECTED_PAGE =
  '/auth/sign-in?redirect=%2Faddress-book%3Fpage%3D2'

const settingKey = (setting) =>
  providerSettingKey(serviceSignInProvider, setting)

const testSettings = {
  [settingKey('clientId')]: 'test-client-id',
  [settingKey('clientSecret')]: 'test-client-secret',
  [settingKey('redirectUrl')]: 'http://localhost:3000/auth/sign-in-oidc',
  [settingKey('serviceId')]: 'service-123',
  [settingKey('policy')]: 'policy-abc',
  [settingKey('refreshTokens')]: true,
  'auth.cookieName': AUTH_COOKIE_NAME
}

const applyTestSettings = () => {
  restoreConfigAfterEach(Object.keys(testSettings))

  beforeEach(() => {
    for (const [key, value] of Object.entries(testSettings)) {
      config.set(key, value)
    }
  })
}

const tokenExpiringIn = (ttlSec, payload = {}) =>
  Jwt.token.generate(
    payload,
    { key: 'test-token-signing-secret', algorithm: 'HS256' },
    { ttlSec }
  )

const SECONDS_PER_HOUR = 3600
const unexpiredToken = tokenExpiringIn(SECONDS_PER_HOUR)
const expiredToken = tokenExpiringIn(-SECONDS_PER_HOUR)

const requestHoldingYar = (query) => {
  const held = new Map()
  return {
    held,
    request: { query, yar: { set: (key, value) => held.set(key, value) } }
  }
}

const requestWithSessionCache = (cached) => {
  const held = new Map(Object.entries(cached))
  return {
    held,
    request: {
      server: {
        app: {
          cache: {
            get: async (sessionId) =>
              held.has(sessionId) ? structuredClone(held.get(sessionId)) : null,
            set: async (sessionId, value) =>
              held.set(sessionId, structuredClone(value))
          }
        }
      }
    }
  }
}

const refreshRequestForOldRefreshToken = () => {
  const tokenUrl = new URL(mockOidcConfig.token_endpoint)
  return nock(tokenUrl.origin).post(
    tokenUrl.pathname,
    (body) => body.refresh_token === 'old-refresh'
  )
}

describe('#authPlugin, with Defra ID and IDM discovery served', () => {
  configureIdm()
  beforeAll(() => {
    serveOidcDiscovery(idmDiscoveryDocument, {
      provider: hiddenIdmSignInProvider
    })
  })
  const getServer = startRealModeServer()

  test('Should send /auth/sign-in to the authorize endpoint of the Defra ID discovery document, as the Defra ID client', async () => {
    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: '/auth/sign-in'
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    const authorizeUrl = new URL(headers.location)
    expect(`${authorizeUrl.origin}${authorizeUrl.pathname}`).toBe(
      mockOidcConfig.authorization_endpoint
    )
    expect(authorizeUrl.searchParams.get('client_id')).toBe(
      config.get(settingKey('clientId'))
    )
  })

  test('Should send a request with no session to /auth/sign-in with its return path', async () => {
    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: PROTECTED_PAGE
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(SIGN_IN_FOR_PROTECTED_PAGE)
  })
})

describe('#authPlugin, in stub mode', () => {
  runInStubMode()

  let server

  afterEach(async () => {
    await stopTestServer(server)
  })

  test('Should start with no discovery served and send a request with no session to /auth/sign-in', async () => {
    server = await startTestServer()

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: PROTECTED_PAGE
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(SIGN_IN_FOR_PROTECTED_PAGE)
  })
})

describe('#authPlugin, when Defra ID discovery fails', () => {
  runInRealMode()

  test('Should refuse to start, naming the discovery URL and the attempts made', async () => {
    discoveryUrlRequest({ persist: true }).reply(
      statusCodes.internalServerError
    )

    await expect(startServerPastDiscoveryRetries()).rejects.toThrow(
      `OIDC discovery at ${config.get(settingKey('oidcDiscoveryUrl'))} failed after 4 attempts`
    )
  })
})

describe('#getBellOptions', () => {
  applyTestSettings()

  const oidcConfig = {
    authorization_endpoint: 'https://idp.example.com/auth',
    token_endpoint: 'https://idp.example.com/token'
  }

  test('Should return the token endpoint from provider.token and mark when the exchange started', () => {
    const request = { app: {} }

    const token = getBellOptions(oidcConfig).provider.token(request)

    expect(token).toBe(oidcConfig.token_endpoint)
    expect(request.app.tokenExchangeStartedAt).toEqual(expect.any(Number))
  })

  test('Should hold the requested return path in yar and return the redirect URL from location', () => {
    const { held, request } = requestHoldingYar({ redirect: '/some/path?x=1' })

    const location = getBellOptions(oidcConfig).location(request)

    expect(Object.fromEntries(held)).toEqual({ redirect: '/some/path?x=1' })
    expect(location).toBe('http://localhost:3000/auth/sign-in-oidc')
  })

  test('Should hold the root in yar when the requested return path is off-site', () => {
    const { held, request } = requestHoldingYar({
      redirect: '//evil.example.com/harvest'
    })

    getBellOptions(oidcConfig).location(request)

    expect(Object.fromEntries(held)).toEqual({ redirect: '/' })
  })

  test('Should hold nothing in yar when no return path is requested', () => {
    const { held, request } = requestHoldingYar({})

    const location = getBellOptions(oidcConfig).location(request)

    expect(held.size).toBe(0)
    expect(location).toBe('http://localhost:3000/auth/sign-in-oidc')
  })

  test('Should add forceReselection, and the requested relationship, to providerParams for /auth/organisation only', () => {
    const options = getBellOptions(oidcConfig)

    const base = options.providerParams({
      path: '/some/other-path',
      query: {}
    })

    expect(base).toEqual({
      serviceId: 'service-123',
      p: 'policy-abc',
      response_mode: 'query'
    })

    const withForce = options.providerParams({
      path: '/auth/organisation',
      query: {}
    })

    expect(withForce).toEqual({
      serviceId: 'service-123',
      p: 'policy-abc',
      response_mode: 'query',
      forceReselection: true
    })

    const withRelationshipId = options.providerParams({
      path: '/auth/organisation',
      query: { organisationId: 'org-999' }
    })

    expect(withRelationshipId).toEqual({
      serviceId: 'service-123',
      p: 'policy-abc',
      response_mode: 'query',
      forceReselection: true,
      relationshipId: 'org-999'
    })
  })

  test('Should map the decoded JWT payload to credentials.profile', () => {
    const options = getBellOptions(oidcConfig)

    const payload = {
      contactId: 'CRN123',
      firstName: 'Andrew',
      lastName: 'Farmer',
      currentRelationshipId: 'REL-1'
    }
    const credentials = { token: tokenExpiringIn(SECONDS_PER_HOUR, payload) }

    options.provider.profile(credentials)

    expect(credentials.profile).toMatchObject({
      ...payload,
      crn: 'CRN123',
      name: 'Andrew Farmer',
      organisationId: 'REL-1'
    })
  })
})

describe('#getCookieOptions', () => {
  applyTestSettings()
  runAgainstServedOidcDiscovery(mockOidcConfig, {
    restoringConfigKeys: ['stubMode']
  })

  test('Should use the configured auth cookie name', () => {
    expect(getCookieOptions().cookie.name).toBe(AUTH_COOKIE_NAME)
  })

  test('Should build the /auth/sign-in redirect from the pathname and search', () => {
    const redirect = getCookieOptions().redirectTo({
      url: {
        pathname: '/origin',
        search: '?a=1'
      }
    })

    expect(redirect).toBe('/auth/sign-in?redirect=%2Forigin%3Fa%3D1')
  })

  test('Should encode the return URL query string in the /auth/sign-in redirect', () => {
    const redirect = getCookieOptions().redirectTo({
      url: {
        pathname: '/address-book',
        search: '?q=France&page=2'
      }
    })

    expect(redirect).toBe(
      '/auth/sign-in?redirect=%2Faddress-book%3Fq%3DFrance%26page%3D2'
    )
  })

  test('Should keep sending unauthenticated requests to /auth/sign-in in stub mode', () => {
    config.set('stubMode', true)

    const redirect = getCookieOptions().redirectTo({
      url: {
        pathname: '/origin',
        search: '?a=1'
      }
    })

    expect(redirect).toBe('/auth/sign-in?redirect=%2Forigin%3Fa%3D1')
  })

  test('Should find a session invalid when the cache does not hold it', async () => {
    const { request } = requestWithSessionCache({})

    const res = await getCookieOptions().validate(request, {
      sessionId: 'missing'
    })

    expect(res).toEqual({ isValid: false })
  })

  test('Should find a session with an unexpired token valid, without a refresh, and leave the cache as it was', async () => {
    const userSession = {
      token: unexpiredToken,
      refreshToken: 'old-refresh'
    }
    const { held, request } = requestWithSessionCache({
      'session-1': userSession
    })
    const refreshRequest = refreshRequestForOldRefreshToken().reply(
      statusCodes.ok,
      { access_token: 'new-access-token', refresh_token: 'new-refresh-token' }
    )

    const res = await getCookieOptions().validate(request, {
      sessionId: 'session-1'
    })

    expect(res).toEqual({ isValid: true, credentials: userSession })
    expect(refreshRequest.isDone()).toBe(false)
    expect(held.get('session-1')).toEqual(userSession)
  })

  test('Should refresh an expired token at the Defra ID token endpoint and cache the new tokens', async () => {
    const { held, request } = requestWithSessionCache({
      'session-1': { token: expiredToken, refreshToken: 'old-refresh' }
    })
    const refreshedSession = {
      token: 'new-access-token',
      refreshToken: 'new-refresh-token'
    }
    const refreshRequest = refreshRequestForOldRefreshToken().reply(
      statusCodes.ok,
      { access_token: 'new-access-token', refresh_token: 'new-refresh-token' }
    )

    const res = await getCookieOptions().validate(request, {
      sessionId: 'session-1'
    })

    expect(refreshRequest.isDone()).toBe(true)
    expect(held.get('session-1')).toEqual(refreshedSession)
    expect(res).toEqual({ isValid: true, credentials: refreshedSession })
  })

  test('Should find a session with an expired token invalid, without a refresh, when token refresh is off', async () => {
    config.set(settingKey('refreshTokens'), false)
    const userSession = {
      token: expiredToken,
      refreshToken: 'old-refresh'
    }
    const { held, request } = requestWithSessionCache({
      'session-1': userSession
    })
    const refreshRequest = refreshRequestForOldRefreshToken().reply(
      statusCodes.ok,
      { access_token: 'new-access-token', refresh_token: 'new-refresh-token' }
    )

    const res = await getCookieOptions().validate(request, {
      sessionId: 'session-1'
    })

    expect(res).toEqual({ isValid: false })
    expect(refreshRequest.isDone()).toBe(false)
    expect(held.get('session-1')).toEqual(userSession)
  })

  test('Should find a session invalid, and leave the cache as it was, when the token endpoint refuses the refresh', async () => {
    const userSession = {
      token: expiredToken,
      refreshToken: 'old-refresh'
    }
    const { held, request } = requestWithSessionCache({
      'session-1': userSession
    })
    const refreshRequest = refreshRequestForOldRefreshToken().reply(
      statusCodes.badRequest,
      { error: 'invalid_grant' }
    )

    const res = await getCookieOptions().validate(request, {
      sessionId: 'session-1'
    })

    expect(res).toEqual({ isValid: false })
    expect(refreshRequest.isDone()).toBe(true)
    expect(held.get('session-1')).toEqual(userSession)
  })
})
