import Jwt from '@hapi/jwt'
import * as cheerio from 'cheerio'
import nock from 'nock'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'

import {
  hiddenIdmSignInProvider,
  providerSettingKey
} from '../../auth/identity-providers.js'
import { config } from '../../config/config.js'
import {
  idmSignInPage,
  idmSignedInPage,
  idmSignedOutPage
} from '../app/auth/page.js'
import { copy as sharedEn } from '../app/shared/copy.en.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { cookieHeaderOf } from '../common/test-helpers/address-book-requests.js'
import { awaitEmfDocumentForOperation } from '../common/test-helpers/emf-documents.js'
import {
  applyIdmSettings,
  idmDiscoveryDocument,
  idmKeysRequest,
  idmSettingKeys,
  idmSettings
} from '../common/test-helpers/idm-sign-in-settings.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import {
  recordModuleLoggerError,
  recordModuleLoggerWarn
} from '../common/test-helpers/module-logger-lines.js'
import { restoreConfigAfterEach } from '../common/test-helpers/restore-config-after-each.js'
import { textOf, textsOf } from '../common/test-helpers/rendered-text.js'
import { runInRealMode } from '../common/test-helpers/real-mode.js'
import { serviceSessionCookieFor } from '../common/test-helpers/session-auth.js'
import {
  discoveryUrlRequest,
  serveOidcDiscovery
} from '../common/test-helpers/serve-oidc-discovery.js'
import {
  generateSigningKey,
  signToken
} from '../common/test-helpers/signing-key.js'
import {
  startRealModeServer,
  startTestServer,
  stopTestServer
} from '../common/test-helpers/test-server.js'
import { idmPaths } from './idm-sign-in.js'

const SIGN_IN_FAILED = 'IDM sign-in failed'

const configureIdm = () => {
  const originalValues = Object.fromEntries(
    idmSettingKeys.map((key) => [key, config.get(key)])
  )
  beforeAll(() => {
    applyIdmSettings()
  })
  afterAll(() => {
    for (const [key, value] of Object.entries(originalValues)) {
      config.set(key, value)
    }
  })
}

const startServerPastDiscoveryRetries = async () => {
  const fakeStepMs = 10
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    let settled = false
    const starting = startTestServer()
    starting.then(
      () => (settled = true),
      () => (settled = true)
    )
    while (!settled) {
      await new Promise((resolve) => setImmediate(resolve))
      await vi.advanceTimersByTimeAsync(fakeStepMs)
    }
    return await starting
  } finally {
    vi.useRealTimers()
  }
}

const authCookieName = () => config.get('auth.cookieName')

const setCookieNames = (headers) =>
  [headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((cookie) => cookie.split('=')[0])

const sendsServiceSignInToDefraId = (getServer) =>
  test('Should send /auth/sign-in to the Defra ID authorize endpoint', async () => {
    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: '/auth/sign-in'
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toMatch(
      new RegExp(`^${mockOidcConfig.authorization_endpoint}\\?`)
    )
  })

const summaryListOf = ($, testId) =>
  Object.fromEntries(
    $(`[data-testid="${testId}"] .govuk-summary-list__row`)
      .map((_, row) => [
        [
          textOf($, $(row).find('dt')),
          textOf($, $(row).find('dd.govuk-summary-list__value'))
        ]
      ])
      .get()
  )

const claimsShownFor = (token) =>
  Object.fromEntries(
    Object.entries(Jwt.token.decode(token).decoded.payload).map(
      ([name, value]) => [name, String(value)]
    )
  )

describe('IDM sign-in, without an IDM discovery URL', () => {
  const getServer = startRealModeServer()

  test.each(Object.values(idmPaths))('Should not serve %s', async (path) => {
    const { statusCode } = await getServer().inject({
      method: 'GET',
      url: path
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  sendsServiceSignInToDefraId(getServer)
})

describe('IDM sign-in, when IDM discovery fails', () => {
  runInRealMode()
  configureIdm()
  const { entriesWith: errorLogs } = recordModuleLoggerError()

  let server

  afterEach(async () => {
    await stopTestServer(server)
  })

  test('Should start the service, send /auth/sign-in to the Defra ID authorize endpoint, serve no IDM page and log the discovery failure once', async () => {
    const discoveryFailed = 'IDM discovery failed, IDM sign-in not served'
    serveOidcDiscovery()
    discoveryUrlRequest({
      persist: true,
      provider: hiddenIdmSignInProvider
    }).replyWithError('IDM unreachable')

    server = await startServerPastDiscoveryRetries()

    const signIn = await server.inject({ method: 'GET', url: '/auth/sign-in' })
    expect(signIn.statusCode).toBe(statusCodes.redirectFound)
    expect(signIn.headers.location).toMatch(
      new RegExp(`^${mockOidcConfig.authorization_endpoint}\\?`)
    )
    const idmSignIn = await server.inject({
      method: 'GET',
      url: idmPaths.signIn
    })
    expect(idmSignIn.statusCode).toBe(statusCodes.notFound)
    expect(errorLogs(discoveryFailed)).toEqual([
      {
        fields: {
          err: expect.any(Error),
          discoveryUrl: idmSettings.oidcDiscoveryUrl
        },
        message: discoveryFailed
      }
    ])
  })
})

describe('IDM sign-in, with an IDM discovery URL but no client secret', () => {
  runInRealMode()
  configureIdm()
  const { entriesWith: warnLogs } = recordModuleLoggerWarn()
  const clientSecretKey = providerSettingKey(
    hiddenIdmSignInProvider,
    'clientSecret'
  )
  restoreConfigAfterEach([clientSecretKey])

  let server

  afterEach(async () => {
    await stopTestServer(server)
  })

  test('Should serve no IDM page and log the missing setting by name', async () => {
    const settingsMissing =
      'IDM client settings missing, IDM sign-in not served'
    config.set(clientSecretKey, '')
    serveOidcDiscovery()

    server = await startTestServer()

    const { statusCode } = await server.inject({
      method: 'GET',
      url: idmPaths.signIn
    })
    expect(statusCode).toBe(statusCodes.notFound)
    expect(warnLogs(settingsMissing)).toEqual([
      {
        fields: { missingSettings: [clientSecretKey] },
        message: settingsMissing
      }
    ])
  })
})

describe('IDM sign-in, with an IDM discovery URL', () => {
  configureIdm()
  beforeAll(() => {
    serveOidcDiscovery(idmDiscoveryDocument, {
      provider: hiddenIdmSignInProvider
    })
  })
  const getServer = startRealModeServer()

  const { entriesWith: errorLogs } = recordModuleLoggerError()

  const signingKey = generateSigningKey('idm-key')
  const otherKey = generateSigningKey('other-key')

  const idTokenSignedWith = (key) =>
    signToken(key, {
      aud: idmSettings.clientId,
      iss: idmDiscoveryDocument.issuer,
      sub: 'idm-user',
      contactId: 'contact-1',
      sessionId: 'idm-session-1',
      correlationId: 'correlation-1'
    })

  const idmAuth = ({ idToken, accessToken = idToken }) => ({
    strategy: 'idm',
    credentials: {
      token: accessToken,
      profile: {
        idToken,
        expiresIn: 3600,
        scope: 'openid offline_access',
        refreshTokenReturned: true
      }
    }
  })

  const completeSignIn = (tokens) =>
    getServer().inject({
      method: 'GET',
      url: idmPaths.callback,
      auth: idmAuth(tokens)
    })

  const openSignedInPage = (cookie) =>
    getServer().inject({
      method: 'GET',
      url: idmPaths.signedIn,
      headers: { cookie }
    })

  const signInAndOpenSignedInPage = async (tokens) => {
    const callback = await completeSignIn(tokens)
    const page = await openSignedInPage(cookieHeaderOf(callback.headers))
    return cheerio.load(page.payload)
  }

  const expectUnableToSignInPage = (payload) => {
    const $ = cheerio.load(payload)
    expect(textOf($, 'h1')).toBe(sharedEn.unauthorised.heading)
    expect($('main a.govuk-link').attr('href')).toBe(idmPaths.signIn)
  }

  beforeEach(() => {
    serveOidcDiscovery(idmDiscoveryDocument, {
      provider: hiddenIdmSignInProvider
    })
    idmKeysRequest({ persist: true }).reply(statusCodes.ok, {
      keys: [signingKey.publicJwk]
    })
  })

  sendsServiceSignInToDefraId(getServer)

  test.each([
    [idmPaths.signIn, idmSignInPage],
    [idmPaths.signedIn, idmSignedInPage],
    [idmPaths.signedOut, idmSignedOutPage]
  ])('Should carry the page from auth/page.js on %s', (path, page) => {
    const route = getServer()
      .table()
      .find((candidate) => candidate.path === path)

    expect(route.settings.app.page).toEqual(page)
  })

  test('Should show a start page whose button links to the route that goes to IDM', async () => {
    const { statusCode, payload } = await getServer().inject({
      method: 'GET',
      url: idmPaths.signIn
    })
    const $ = cheerio.load(payload)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('main a.govuk-button').attr('href')).toBe(idmPaths.goToIdm)
  })

  test('Should send the browser to the IDM authorize endpoint with the IDM client, service, policy and callback', async () => {
    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: idmPaths.goToIdm
    })
    const location = new URL(headers.location)

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(`${location.origin}${location.pathname}`).toBe(
      idmDiscoveryDocument.authorization_endpoint
    )
    expect(Object.fromEntries(location.searchParams)).toMatchObject({
      client_id: 'idm-client-id',
      serviceId: 'idm-service-id',
      p: 'b2c_1a_cui_cpdev_signupsignin',
      response_mode: 'query',
      redirect_uri: 'http://localhost:3002/auth/callback',
      scope: 'openid offline_access idm-client-id'
    })
  })

  describe('through the IDM Bell strategy', () => {
    let logSpy

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      logSpy.mockRestore()
    })

    test('Should exchange the code at IDM, show the token response IDM returned and measure the exchange as idm token-exchange', async () => {
      const idToken = idTokenSignedWith(signingKey)
      const tokenEndpoint = new URL(idmDiscoveryDocument.token_endpoint)
      nock(tokenEndpoint.origin)
        .post(tokenEndpoint.pathname)
        .reply(statusCodes.ok, {
          id_token: idToken,
          access_token: idToken,
          token_type: 'Bearer',
          expires_in: 1800,
          scope: 'openid offline_access idm-client-id',
          refresh_token: 'idm-refresh-token'
        })
      const goToIdm = await getServer().inject({
        method: 'GET',
        url: idmPaths.goToIdm
      })
      const state = new URL(goToIdm.headers.location).searchParams.get('state')

      const callback = await getServer().inject({
        method: 'GET',
        url: `${idmPaths.callback}?code=idm-code&state=${state}`,
        headers: { cookie: cookieHeaderOf(goToIdm.headers) }
      })
      const page = await openSignedInPage(cookieHeaderOf(callback.headers))

      expect(callback.headers.location).toBe(idmPaths.signedIn)
      expect(
        summaryListOf(cheerio.load(page.payload), 'token-response')
      ).toEqual({
        expires_in: '1800',
        scope: 'openid offline_access idm-client-id',
        'refresh token returned': 'Yes'
      })
      const exchange = await awaitEmfDocumentForOperation(
        logSpy,
        'token-exchange'
      )
      expect(exchange.Dependency).toBe('idm')
      expect(exchange.ExternalCallFailure).toBe(0)
    })
  })

  test('Should redirect a verified sign-in to the signed-in page', async () => {
    const { statusCode, headers } = await completeSignIn({
      idToken: idTokenSignedWith(signingKey)
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(idmPaths.signedIn)
  })

  test('Should list every ID token claim with its value and the token response, and say the access token is the ID token', async () => {
    const idToken = idTokenSignedWith(signingKey)

    const $ = await signInAndOpenSignedInPage({ idToken })

    expect(summaryListOf($, 'id-token-claims')).toEqual(claimsShownFor(idToken))
    expect($('[data-testid="access-token-claims"]')).toHaveLength(0)
    expect(textsOf($, 'main p.govuk-body')).toContain(
      'The access token is the ID token.'
    )
    expect(summaryListOf($, 'token-response')).toEqual({
      expires_in: '3600',
      scope: 'openid offline_access',
      'refresh token returned': 'Yes'
    })
  })

  test('Should list every access token claim with its value when the access token is not the ID token', async () => {
    const accessToken = signToken(signingKey, { scp: 'access-scope' })

    const $ = await signInAndOpenSignedInPage({
      idToken: idTokenSignedWith(signingKey),
      accessToken
    })

    expect(summaryListOf($, 'access-token-claims')).toEqual(
      claimsShownFor(accessToken)
    )
  })

  test("Should leave the caller's service session in the cache and set or clear no service session cookie", async () => {
    const serviceSessionId = 'stub-signed-in-session'
    const serviceSession = {
      sessionId: serviceSessionId,
      organisationId: 'stub-org-1',
      token: 'stub-token'
    }
    await getServer().app.cache.set(serviceSessionId, serviceSession)

    const { headers } = await getServer().inject({
      method: 'GET',
      url: idmPaths.callback,
      auth: idmAuth({ idToken: idTokenSignedWith(signingKey) }),
      headers: {
        cookie: await serviceSessionCookieFor(getServer(), serviceSessionId)
      }
    })

    expect(setCookieNames(headers)).not.toContain(authCookieName())
    expect(await getServer().app.cache.get(serviceSessionId)).toEqual(
      serviceSession
    )
  })

  test('Should show the unable to sign in page, linking back to the start page, and log the error in full, when IDM returns an error', async () => {
    const { statusCode, payload } = await getServer().inject({
      method: 'GET',
      url: `${idmPaths.callback}?error=access_denied&error_description=AADB2C90091&state=idm-state`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expectUnableToSignInPage(payload)
    expect(payload).not.toContain('AADB2C90091')
    expect(errorLogs(SIGN_IN_FAILED)).toEqual([
      {
        fields: {
          err: expect.any(Error),
          idmError: 'access_denied',
          idmErrorDescription: 'AADB2C90091',
          state: 'idm-state'
        },
        message: SIGN_IN_FAILED
      }
    ])
  })

  test('Should show the unable to sign in page, not the signed-out page, and log the error in full, when IDM returns an error to the signed-out page', async () => {
    const { statusCode, payload } = await getServer().inject({
      method: 'GET',
      url: `${idmPaths.signedOut}?error=access_denied&error_description=AADB2C90091&state=idm-state`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expectUnableToSignInPage(payload)
    expect(payload).not.toContain('AADB2C90091')
    expect(errorLogs(SIGN_IN_FAILED)).toEqual([
      {
        fields: {
          idmError: 'access_denied',
          idmErrorDescription: 'AADB2C90091',
          state: 'idm-state'
        },
        message: SIGN_IN_FAILED
      }
    ])
  })

  test('Should show the unable to sign in page, and log the refusal with the state and the IDM ids, when the ID token is signed by a key IDM does not serve', async () => {
    const tokenRefused = 'IDM ID token refused'

    const { payload } = await getServer().inject({
      method: 'GET',
      url: `${idmPaths.callback}?state=idm-state`,
      auth: idmAuth({ idToken: idTokenSignedWith(otherKey) })
    })

    expectUnableToSignInPage(payload)
    expect(errorLogs(tokenRefused)).toEqual([
      {
        fields: {
          err: expect.any(Error),
          state: 'idm-state',
          contactId: 'contact-1',
          sessionId: 'idm-session-1',
          correlationId: 'correlation-1'
        },
        message: tokenRefused
      }
    ])
  })

  test('Should send a visitor with no IDM sign-in from the signed-in page to the start page', async () => {
    const { statusCode, headers } = await openSignedInPage('')

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(idmPaths.signIn)
  })

  test('Should show the signed-out page without a session', async () => {
    const { statusCode, payload } = await getServer().inject({
      method: 'GET',
      url: idmPaths.signedOut
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(textOf(cheerio.load(payload), 'h1')).toBe('Signed out')
  })
})
