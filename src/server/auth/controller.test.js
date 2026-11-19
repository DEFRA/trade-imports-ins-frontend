import * as cheerio from 'cheerio'
import nock from 'nock'
import { vi } from 'vitest'

import { config } from '../../config/config.js'
import { SERVICE_SIGN_IN_STRATEGY } from '../../plugins/auth.js'
import { copy as sharedEn } from '../app/shared/copy.en.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  awaitEmfDocumentForOperation,
  readEmfDocuments
} from '../common/test-helpers/emf-documents.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { recordRequestLoggerError } from '../common/test-helpers/module-logger-lines.js'
import { textOf } from '../common/test-helpers/rendered-text.js'
import { runAgainstServedOidcDiscovery } from '../common/test-helpers/serve-oidc-discovery.js'
import { sessionAuth } from '../common/test-helpers/session-auth.js'
import {
  generateSigningKey,
  signToken
} from '../common/test-helpers/signing-key.js'
import { startRealModeServer } from '../common/test-helpers/test-server.js'

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

const HTTP_STATUS_FOUND = 302
const SIGN_IN_OIDC_URL = '/auth/sign-in-oidc'

const signingKey = generateSigningKey('defra-id-key')
const otherKey = generateSigningKey('other-key')

const defraIdAuth = ({ token, sessionId, ...profileOverrides }) => ({
  strategy: SERVICE_SIGN_IN_STRATEGY,
  credentials: {
    profile: {
      sessionId,
      crn: 'CRN123',
      organisationId: 'org-1',
      ...profileOverrides
    },
    token,
    refreshToken: 'mock-refresh-token'
  }
})

const keysRequest = () => {
  const keysUrl = new URL(mockOidcConfig.jwks_uri)
  return nock(keysUrl.origin).get(keysUrl.pathname)
}

const serveSigningKey = () =>
  keysRequest().reply(statusCodes.ok, { keys: [signingKey.publicJwk] })

const expectSessionCookieCleared = (headers) => {
  const setCookie = headers['set-cookie'] ?? []
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  expect(cookies.join('\n')).toContain('sid=')
}

const expectDefraIdSignOut = (location) => {
  const signOutUrl = new URL(location)
  expect(signOutUrl.pathname).toMatch(/\/signout$/)
  expect(signOutUrl.searchParams.get('post_logout_redirect_uri')).toBe(
    config.get('defraId.signOutRedirectUrl')
  )
}

describe('#authController', () => {
  const getServer = startRealModeServer()

  runAgainstServedOidcDiscovery(mockOidcConfig)
  const { entriesWith: errorLogs } = recordRequestLoggerError(getServer)

  const signInOidc = (profile) =>
    getServer().inject({
      method: 'GET',
      url: SIGN_IN_OIDC_URL,
      auth: defraIdAuth(profile)
    })

  test('GET /auth/sign-in redirects to home', async () => {
    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: '/auth/sign-in',
      auth: {
        strategy: SERVICE_SIGN_IN_STRATEGY,
        credentials: {}
      }
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: '/auth/sign-out'
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out drops the session and redirects authenticated users to the Defra ID sign-out URL', async () => {
    const sessionId = 'signout-authenticated'
    await getServer().app.cache.set(sessionId, { sessionId, token: 'token' })

    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: '/auth/sign-out',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expectDefraIdSignOut(headers.location)
    expect(await getServer().app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })

  test('GET /auth/sign-out-oidc redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: '/auth/sign-out-oidc'
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out-oidc clears authenticated session and redirects to the Defra ID sign-out URL', async () => {
    const sessionId = 'signout-oidc-authenticated'
    await getServer().app.cache.set(sessionId, { sessionId, token: 'token' })

    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: '/auth/sign-out-oidc',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expectDefraIdSignOut(headers.location)
    expect(await getServer().app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })

  test('GET /auth/sign-in-oidc renders unauthorised, linking to /auth/sign-in, without checking the token, when organisationId is missing', async () => {
    const sessionId = 'signin-oidc-no-organisation'
    const keys = serveSigningKey()

    const { statusCode, payload, headers } = await signInOidc({
      sessionId,
      token: signToken(signingKey, { sub: 'user-1' }),
      organisationId: null
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = cheerio.load(payload)
    expect(textOf($, 'h1')).toBe(sharedEn.unauthorised.heading)
    expect(
      $('main a.govuk-link')
        .filter(
          (_, link) => $(link).text() === sharedEn.unauthorised.signInLinkText
        )
        .attr('href')
    ).toBe('/auth/sign-in')
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
    expect(keys.isDone()).toBe(false)
    expect(await getServer().app.cache.get(sessionId)).toBeNull()
  })

  test("GET /auth/sign-in-oidc renders unauthorised, stores no session, and logs the refusal in full with the user's ids, when the token is signed by a key Defra ID does not serve", async () => {
    const sessionId = 'signin-oidc-unverified'
    const tokenRefused = 'Token verification failed for /auth/sign-in-oidc'
    serveSigningKey()

    const { statusCode, payload, headers } = await signInOidc({
      sessionId,
      token: signToken(otherKey, { sub: 'user-1' })
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain(sharedEn.unauthorised.heading)
    expect(payload).toContain(
      `${sharedEn.unauthorised.title} - ${sharedEn.layout.serviceName} - ${sharedEn.layout.govukSuffix}`
    )
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
    expect(await getServer().app.cache.get(sessionId)).toBeNull()
    expect(errorLogs(tokenRefused)).toEqual([
      {
        fields: {
          err: expect.any(Error),
          crn: 'CRN123',
          organisationId: 'org-1',
          sessionId
        },
        message: tokenRefused
      }
    ])
  })

  test('GET /auth/sign-in-oidc renders unauthorised and logs the Bell error in full, with the state, when Bell cannot authenticate the callback', async () => {
    const bellFailed = 'Bell auth failed for /auth/sign-in-oidc'

    const { statusCode, payload } = await getServer().inject({
      method: 'GET',
      url: `${SIGN_IN_OIDC_URL}?code=unused&state=unmatched&refresh=1`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain(sharedEn.unauthorised.heading)
    expect(errorLogs(bellFailed)).toEqual([
      {
        fields: { err: expect.any(Error), state: 'unmatched' },
        message: bellFailed
      }
    ])
  })

  describe('Defra ID token exchange metrics', () => {
    let logSpy

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      logSpy.mockRestore()
    })

    test('GET /auth/sign-in-oidc records the Defra ID token exchange it completed', async () => {
      serveSigningKey()

      const { statusCode, headers } = await getServer().inject({
        method: 'GET',
        url: SIGN_IN_OIDC_URL,
        auth: defraIdAuth({
          sessionId: 'signin-oidc-session',
          token: signToken(signingKey, { sub: 'user-1' })
        }),
        app: { tokenExchangeStartedAt: performance.now() }
      })

      expect(statusCode).toBe(HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/')
      const document = await awaitEmfDocumentForOperation(
        logSpy,
        'token-exchange'
      )
      expect(document.Dependency).toBe('defra-id')
      expect(document.Interface).toBe('SYN-11')
      expect(document.ExternalCallFailure).toBe(0)
    })

    test('GET /auth/sign-in-oidc records the Defra ID token exchange as failed when sign-in is not authenticated', async () => {
      const { statusCode, payload } = await getServer().inject({
        method: 'GET',
        url: `${SIGN_IN_OIDC_URL}?code=unused&state=unmatched&refresh=1`,
        app: { tokenExchangeStartedAt: performance.now() }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(payload).toContain(sharedEn.unauthorised.heading)
      await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
      const [document] = readEmfDocuments(logSpy)
      expect(document.Dependency).toBe('defra-id')
      expect(document.Operation).toBe('token-exchange')
      expect(document.ExternalCallFailure).toBe(1)
    })
  })
})
