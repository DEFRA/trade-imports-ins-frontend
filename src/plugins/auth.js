import Jwt from '@hapi/jwt'

import { getOidcConfigWithRetry } from '../auth/get-oidc-config-with-retry.js'
import { serviceSignInProvider } from '../auth/identity-providers.js'
import { refreshTokens } from '../auth/refresh-tokens.js'
import { getSafeRedirect } from '../auth/get-safe-redirect.js'
import { bellOptionsFor } from '../auth/bell-options.js'
import { config } from '../config/config.js'
import { authPaths } from '../server/auth/controller.js'
import { isStubMode } from '../server/common/services/mode.js'

export const SERVICE_SIGN_IN_STRATEGY = 'defra-id'

export const authPlugin = {
  plugin: {
    name: 'auth-plugin',
    register: async (server) => {
      server.auth.strategy('session', 'cookie', getCookieOptions())
      server.auth.default('session')

      if (isStubMode()) {
        return
      }

      const oidcConfig = await getOidcConfigWithRetry(
        server.logger,
        serviceSignInProvider
      )

      server.auth.strategy(
        SERVICE_SIGN_IN_STRATEGY,
        'bell',
        getBellOptions(oidcConfig)
      )
    }
  }
}

function getBellOptions(oidcConfig) {
  return bellOptionsFor(serviceSignInProvider, oidcConfig, {
    name: SERVICE_SIGN_IN_STRATEGY,
    profile(credentials) {
      const payload = Jwt.token.decode(credentials.token).decoded.payload

      credentials.profile = {
        ...payload,
        crn: payload.contactId,
        name: `${payload.firstName} ${payload.lastName}`,
        organisationId: payload.currentRelationshipId
      }
    },
    rememberRedirect(request) {
      if (request.query.redirect) {
        request.yar.set('redirect', getSafeRedirect(request.query.redirect))
      }
    },
    extraProviderParams(request) {
      if (request.path !== authPaths.organisation) {
        return {}
      }
      return {
        forceReselection: true,
        ...(request.query.organisationId && {
          relationshipId: request.query.organisationId
        })
      }
    }
  })
}

function getCookieOptions() {
  return {
    cookie: {
      name: config.get('auth.cookieName'),
      password: config.get('session.cookie.password'),
      path: '/',
      isSecure: config.get('isProduction')
    },
    redirectTo: function (request) {
      const target = `${request.url.pathname}${request.url.search}`
      return `${authPaths.signIn}?redirect=${encodeURIComponent(target)}`
    },
    validate: async function (request, session) {
      const userSession = await request.server.app.cache.get(session.sessionId)

      if (!userSession) {
        return { isValid: false }
      }

      try {
        const decoded = Jwt.token.decode(userSession.token)
        Jwt.token.verifyTime(decoded, { timeSkewSec: 60 })
      } catch {
        if (!config.get('defraId.refreshTokens')) {
          return { isValid: false }
        }
        try {
          const { access_token: token, refresh_token: refreshToken } =
            await refreshTokens(userSession.refreshToken)
          userSession.token = token
          userSession.refreshToken = refreshToken
          await request.server.app.cache.set(session.sessionId, userSession)
        } catch {
          return { isValid: false }
        }
      }

      return { isValid: true, credentials: userSession }
    }
  }
}

export { getBellOptions, getCookieOptions }
