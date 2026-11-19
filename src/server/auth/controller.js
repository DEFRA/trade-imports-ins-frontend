import { getSignOutUrl } from '../../auth/get-sign-out-url.js'
import { validateState } from '../../auth/state.js'
import { verifyToken } from '../../auth/verify-token.js'
import { serviceSignInProvider } from '../../auth/identity-providers.js'
import { getPermissions } from '../../auth/get-permissions.js'
import { getSafeRedirect } from '../../auth/get-safe-redirect.js'
import { recordTokenExchange } from '../../auth/token-exchange-timer.js'
import { base, sharedCopy } from '../app/shared/kit.js'

export const authPaths = Object.freeze({
  signIn: '/auth/sign-in',
  stubSignIn: '/auth/stub-sign-in',
  signInOidc: '/auth/sign-in-oidc',
  signOut: '/auth/sign-out',
  signOutOidc: '/auth/sign-out-oidc',
  organisation: '/auth/organisation'
})

/**
 * Renders the page saying the service is unable to sign the user in.
 *
 * @param {object} h - the Hapi response toolkit
 * @param {{ signInUrl: string }} options - where the page's try-again link goes
 * @returns {object} the rendered view
 */
export const renderUnableToSignIn = (h, { signInUrl }) =>
  h.view('auth/unauthorised', {
    ...base(sharedCopy.unauthorised.title),
    signInUrl
  })

const signInIdsOf = ({ crn, organisationId }) => ({ crn, organisationId })

export const authController = {
  signin: {
    handler: async function (_request, h) {
      return h.redirect('/')
    }
  },
  signinOidc: {
    handler: async function (request, h) {
      recordTokenExchange(request, serviceSignInProvider)

      if (!request.auth.isAuthenticated) {
        request.logger?.error(
          {
            err: request.auth.error,
            state: request.query?.state
          },
          `Bell auth failed for ${authPaths.signInOidc}`
        )
        return renderUnableToSignIn(h, { signInUrl: authPaths.signIn })
      }

      const { profile, token, refreshToken } = request.auth.credentials

      if (!profile.organisationId) {
        request.logger?.error(
          signInIdsOf(profile),
          'Sign-in rejected: missing organisationId in Defra ID token'
        )
        return renderUnableToSignIn(h, { signInUrl: authPaths.signIn })
      }

      try {
        await verifyToken(token, serviceSignInProvider)
      } catch (err) {
        request.logger?.error(
          { err, ...signInIdsOf(profile) },
          `Token verification failed for ${authPaths.signInOidc}`
        )
        return renderUnableToSignIn(h, { signInUrl: authPaths.signIn })
      }

      let role
      let scope
      try {
        ;({ role, scope } = await getPermissions(
          profile.crn,
          profile.organisationId,
          token
        ))
      } catch (err) {
        request.logger?.error(
          { err, ...signInIdsOf(profile) },
          'Failed to load user permissions at sign-in'
        )
        return renderUnableToSignIn(h, { signInUrl: authPaths.signIn })
      }

      await request.server.app.cache.set(profile.sessionId, {
        isAuthenticated: true,
        ...profile,
        role,
        scope,
        token,
        refreshToken
      })

      request.cookieAuth.set({ sessionId: profile.sessionId })

      const redirect = request.yar.get('redirect') ?? '/'
      request.yar.clear('redirect')
      const safeRedirect = getSafeRedirect(redirect)
      return h.redirect(safeRedirect)
    }
  },
  signout: {
    handler: async function (request, h) {
      if (!request.auth.isAuthenticated) {
        return h.redirect('/')
      }
      if (request.auth.credentials?.sessionId) {
        await request.server.app.cache.drop(request.auth.credentials.sessionId)
      }
      request.cookieAuth.clear()
      const signOutUrl = await getSignOutUrl(
        request,
        request.auth.credentials.token
      )
      return h.redirect(signOutUrl)
    }
  },
  signoutOidc: {
    handler: async function (request, h) {
      if (request.auth.isAuthenticated) {
        if (request.query?.state) {
          validateState(request, request.query.state)
        }
        if (request.auth.credentials?.sessionId) {
          await request.server.app.cache.drop(
            request.auth.credentials.sessionId
          )
        }
        request.cookieAuth.clear()

        return h.redirect(
          await getSignOutUrl(request, request.auth.credentials.token)
        )
      }

      return h.redirect('/')
    }
  },
  organisation: {
    handler: async function (request, h) {
      const redirect = request.yar.get('redirect') ?? '/'
      request.yar.clear('redirect')
      const safeRedirect = getSafeRedirect(redirect)
      return h.redirect(safeRedirect)
    }
  }
}
