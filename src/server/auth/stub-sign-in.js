import crypto from 'node:crypto'

import Jwt from '@hapi/jwt'

import { getSafeRedirect } from '#/auth/get-safe-redirect.js'

// Generated once per process rather than hardcoded - this token is only ever
// decoded (never verified against a known key) by the session validator, so
// the secret has no real security value, but a random one avoids committing
// a static credential-shaped string to source.
const STUB_TOKEN_SECRET = crypto.randomBytes(32).toString('hex')
const STUB_SESSION_TTL_SECONDS = 4 * 60 * 60

const DEFAULT_STUB_USER = {
  crn: 'STUB0001',
  name: 'Stub User',
  email: 'stub.user@example.com',
  organisationId: 'stub-org-1'
}

function buildStubToken(sessionId) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return Jwt.token.generate(
    { sessionId, exp: nowSeconds + STUB_SESSION_TTL_SECONDS },
    STUB_TOKEN_SECRET
  )
}

/**
 * Replaces the real Defra ID OIDC round-trip when auth.stubMode is on
 * (see mode.js / plugins/auth.js). Auth is still enforced everywhere else -
 * this only produces the same end state the real sign-in-oidc handler does
 * (cached session + session cookie), signed locally rather than verified
 * against a real identity provider.
 */
export const stubSignInRoutes = {
  plugin: {
    name: 'stub-sign-in-routes',
    register(server) {
      server.route({
        method: 'GET',
        path: '/auth/stub-sign-in',
        options: { auth: false },
        handler: async (request, h) => {
          const sessionId = crypto.randomUUID()
          const token = buildStubToken(sessionId)

          await request.server.app.cache.set(sessionId, {
            isAuthenticated: true,
            sessionId,
            crn: DEFAULT_STUB_USER.crn,
            name: DEFAULT_STUB_USER.name,
            email: DEFAULT_STUB_USER.email,
            organisationId:
              request.query.organisationId ?? DEFAULT_STUB_USER.organisationId,
            role: 'Farmer',
            scope: ['user'],
            token,
            refreshToken: 'stub-refresh-token'
          })

          request.cookieAuth.set({ sessionId })

          return h.redirect(getSafeRedirect(request.query.redirect))
        }
      })
    }
  }
}
