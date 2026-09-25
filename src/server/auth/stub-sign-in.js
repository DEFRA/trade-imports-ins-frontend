import crypto from 'node:crypto'

import Jwt from '@hapi/jwt'

import { getSafeRedirect } from '../../auth/get-safe-redirect.js'

// Generated once per process rather than hardcoded - this token is only ever
// decoded (never verified against a known key) by the session validator, so
// the secret has no real security value, but a random one avoids committing
// a static credential-shaped string to source.
const STUB_TOKEN_SECRET_BYTES = 32
const STUB_TOKEN_SECRET = crypto
  .randomBytes(STUB_TOKEN_SECRET_BYTES)
  .toString('hex')
const HOURS_IN_STUB_SESSION = 4
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const STUB_SESSION_TTL_SECONDS =
  HOURS_IN_STUB_SESSION * MINUTES_PER_HOUR * SECONDS_PER_MINUTE
const MS_PER_SECOND = 1000

const DEFAULT_STUB_USER = {
  crn: 'STUB0001',
  contactId: 2100010101,
  name: 'Stub User',
  email: 'stub.user@example.com',
  organisationId: 'stub-org-1'
}

function buildStubToken(sessionId) {
  const nowSeconds = Math.floor(Date.now() / MS_PER_SECOND)
  return Jwt.token.generate(
    { sessionId, exp: nowSeconds + STUB_SESSION_TTL_SECONDS },
    STUB_TOKEN_SECRET
  )
}

const signIn = async (request, h) => {
  const sessionId = crypto.randomUUID()
  const token = buildStubToken(sessionId)
  const organisationId =
    request.query.organisationId ?? DEFAULT_STUB_USER.organisationId

  await request.server.app.cache.set(sessionId, {
    isAuthenticated: true,
    sessionId,
    crn: DEFAULT_STUB_USER.crn,
    contactId: DEFAULT_STUB_USER.contactId,
    name: DEFAULT_STUB_USER.name,
    email: DEFAULT_STUB_USER.email,
    organisationId,
    currentRelationshipId: organisationId,
    role: 'Farmer',
    scope: ['user'],
    token,
    refreshToken: 'stub-refresh-token'
  })

  request.cookieAuth.set({ sessionId })

  return h.redirect(getSafeRedirect(request.query.redirect))
}

const signOut = async (request, h) => {
  if (request.auth.credentials?.sessionId) {
    await request.server.app.cache.drop(request.auth.credentials.sessionId)
  }
  request.cookieAuth.clear()
  return h.redirect('/')
}

const SIGN_IN_PATHS = ['/auth/stub-sign-in', '/auth/sign-in']
const SIGN_OUT_PATH = '/auth/sign-out'

/**
 * Replaces the real Defra ID OIDC round-trip when stub mode is on
 * (see mode.js / plugins/auth.js). Auth is still enforced everywhere else -
 * this only produces the same end state the real sign-in-oidc handler does
 * (cached session + session cookie), signed locally rather than verified
 * against a real identity provider.
 */
export const stubSignInRoutes = {
  plugin: {
    name: 'stub-sign-in-routes',
    register(server) {
      server.route([
        ...SIGN_IN_PATHS.map((path) => ({
          method: 'GET',
          path,
          options: { auth: false },
          handler: signIn
        })),
        {
          method: 'GET',
          path: SIGN_OUT_PATH,
          options: { auth: { mode: 'try' } },
          handler: signOut
        }
      ])
    }
  }
}
