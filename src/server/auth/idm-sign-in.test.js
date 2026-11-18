import * as cheerio from 'cheerio'
import nock from 'nock'
import { afterAll, beforeAll, beforeEach } from 'vitest'

import { config } from '../../config/config.js'
import { copy as sharedEn } from '../app/shared/copy.en.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { cookieHeaderOf } from '../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { textOf, textsOf } from '../common/test-helpers/rendered-text.js'
import {
  idmOidcDiscoveryUrlKey,
  serveOidcDiscovery
} from '../common/test-helpers/serve-oidc-discovery.js'
import {
  generateSigningKey,
  signToken
} from '../common/test-helpers/signing-key.js'
import { startRealModeServer } from '../common/test-helpers/test-server.js'
import { idmPaths } from './idm-sign-in.js'

const IDM_SETTINGS = {
  [idmOidcDiscoveryUrlKey]:
    'https://idm.example.test/b2c/policy/.well-known/openid-configuration',
  'idm.clientId': 'idm-client-id',
  'idm.serviceId': 'idm-service-id',
  'idm.clientSecret': 'idm-client-secret'
}

const IDM_ORIGIN = 'https://idm.example.test'
const IDM_DOCUMENT = {
  issuer: `${IDM_ORIGIN}/issuer`,
  authorization_endpoint: `${IDM_ORIGIN}/authorize`,
  token_endpoint: `${IDM_ORIGIN}/token`,
  jwks_uri: `${IDM_ORIGIN}/keys`
}

const configureIdmBeforeServerStarts = () => {
  const originalValues = Object.fromEntries(
    Object.keys(IDM_SETTINGS).map((key) => [key, config.get(key)])
  )
  beforeAll(() => {
    for (const [key, value] of Object.entries(IDM_SETTINGS)) {
      config.set(key, value)
    }
    serveOidcDiscovery(IDM_DOCUMENT, {
      discoveryUrlKey: idmOidcDiscoveryUrlKey
    })
  })
  afterAll(() => {
    for (const [key, value] of Object.entries(originalValues)) {
      config.set(key, value)
    }
  })
}

const authCookieName = () => config.get('auth.cookieName')

const setCookieNames = (headers) =>
  [headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((cookie) => cookie.split('=')[0])

describe('IDM sign-in, without an IDM discovery URL', () => {
  const getServer = startRealModeServer()

  test.each(Object.values(idmPaths))('Should not serve %s', async (path) => {
    const { statusCode } = await getServer().inject({
      method: 'GET',
      url: path
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('Should still send /auth/sign-in to the Defra ID authorize endpoint', async () => {
    const { statusCode, headers } = await getServer().inject({
      method: 'GET',
      url: '/auth/sign-in'
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toMatch(
      new RegExp(`^${mockOidcConfig.authorization_endpoint}\\?`)
    )
  })
})

describe('IDM sign-in, with an IDM discovery URL', () => {
  configureIdmBeforeServerStarts()
  const getServer = startRealModeServer()

  const signingKey = generateSigningKey('idm-key')
  const otherKey = generateSigningKey('other-key')

  const idTokenSignedWith = (key) =>
    signToken(key, {
      aud: IDM_SETTINGS['idm.clientId'],
      iss: IDM_DOCUMENT.issuer,
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
    serveOidcDiscovery(IDM_DOCUMENT, {
      discoveryUrlKey: idmOidcDiscoveryUrlKey
    })
    nock(IDM_ORIGIN)
      .persist()
      .get('/keys')
      .reply(statusCodes.ok, { keys: [signingKey.publicJwk] })
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
      IDM_DOCUMENT.authorization_endpoint
    )
    expect(Object.fromEntries(location.searchParams)).toMatchObject({
      client_id: 'idm-client-id',
      serviceId: 'idm-service-id',
      p: 'b2c_1a_cui_cpdev_signupsignin',
      response_mode: 'query',
      redirect_uri: 'http://localhost:3002/auth/callback'
    })
  })

  test('Should redirect a verified sign-in to the signed-in page', async () => {
    const { statusCode, headers } = await completeSignIn({
      idToken: idTokenSignedWith(signingKey)
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(idmPaths.signedIn)
  })

  test('Should show the ID token claims and token response, and say the access token is the ID token', async () => {
    const $ = await signInAndOpenSignedInPage({
      idToken: idTokenSignedWith(signingKey)
    })

    expect(textsOf($, '[data-testid="id-token-claims"] dt')).toEqual(
      expect.arrayContaining(['aud', 'iss', 'sub', 'contactId'])
    )
    expect($('[data-testid="access-token-claims"]')).toHaveLength(0)
    expect(textsOf($, 'main p.govuk-body')).toContain(
      'The access token is the ID token.'
    )
    expect(textsOf($, '[data-testid="token-response"] dd')).toEqual([
      '3600',
      'openid offline_access',
      'Yes'
    ])
  })

  test('Should show the access token claims when the access token is not the ID token', async () => {
    const $ = await signInAndOpenSignedInPage({
      idToken: idTokenSignedWith(signingKey),
      accessToken: signToken(signingKey, { scp: 'access-scope' })
    })

    expect(textsOf($, '[data-testid="access-token-claims"] dt')).toContain(
      'scp'
    )
  })

  test('Should leave an existing service session in the cache and set or clear no service session cookie', async () => {
    const serviceSessionId = 'stub-signed-in-session'
    const serviceSession = {
      sessionId: serviceSessionId,
      organisationId: 'stub-org-1',
      token: 'stub-token'
    }
    await getServer().app.cache.set(serviceSessionId, serviceSession)

    const { headers } = await completeSignIn({
      idToken: idTokenSignedWith(signingKey)
    })

    expect(setCookieNames(headers)).not.toContain(authCookieName())
    expect(await getServer().app.cache.get(serviceSessionId)).toEqual(
      serviceSession
    )
  })

  test('Should show the unable to sign in page, linking back to the start page, when IDM returns an error', async () => {
    const { statusCode, payload } = await getServer().inject({
      method: 'GET',
      url: `${idmPaths.callback}?error=access_denied&error_description=AADB2C90091`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expectUnableToSignInPage(payload)
    expect(payload).not.toContain('AADB2C90091')
  })

  test('Should show the unable to sign in page when the ID token is signed by a key IDM does not serve', async () => {
    const { payload } = await completeSignIn({
      idToken: idTokenSignedWith(otherKey)
    })

    expectUnableToSignInPage(payload)
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
