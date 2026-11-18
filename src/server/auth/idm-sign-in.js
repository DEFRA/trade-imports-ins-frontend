import Jwt from '@hapi/jwt'

import { idmProvider, providerSetting } from '../../auth/identity-providers.js'
import { recordTokenExchange } from '../../auth/token-exchange-timer.js'
import { verifyToken } from '../../auth/verify-token.js'
import { IDM_STRATEGY, idmAuthPlugin } from '../../plugins/idm-auth.js'
import {
  idmSignInPage,
  idmSignedInPage,
  idmSignedOutPage,
  unauthorisedPage
} from '../app/auth/page.js'
import { base, sharedCopy, SURFACES } from '../app/shared/kit.js'

export const idmPaths = Object.freeze({
  signIn: '/auth/idm/sign-in',
  goToIdm: '/auth/idm/go-to-defra-id',
  callback: '/auth/callback',
  signedIn: '/auth/idm/signed-in',
  signedOut: '/auth/signed-out'
})

const SIGN_IN_SESSION_KEY = 'idmSignIn'

const claimRows = (claims) =>
  Object.entries(claims).map(([name, value]) => ({
    key: { text: name },
    value: { text: typeof value === 'string' ? value : JSON.stringify(value) }
  }))

function signInSummaryRows({
  idTokenClaims,
  accessTokenClaims,
  expiresIn,
  scope,
  refreshTokenReturned
}) {
  return {
    idTokenClaims: claimRows(idTokenClaims),
    accessTokenClaims: accessTokenClaims && claimRows(accessTokenClaims),
    tokenResponse: [
      { key: { text: 'expires_in' }, value: { text: String(expiresIn) } },
      { key: { text: 'scope' }, value: { text: scope } },
      {
        key: { text: 'refresh token returned' },
        value: { text: refreshTokenReturned ? 'Yes' : 'No' }
      }
    ]
  }
}

const claimsOf = (token) => Jwt.token.decode(token).decoded.payload

const accessTokenClaimsOf = (accessToken, idToken) =>
  accessToken === idToken ? undefined : claimsOf(accessToken)

const unableToSignIn = (h) =>
  h.view('auth/unauthorised', {
    ...base(sharedCopy.unauthorised.title),
    signInUrl: idmPaths.signIn
  })

const showSignIn = (_request, h) =>
  h.view('auth/idm-sign-in', {
    ...base('Sign in with Defra ID'),
    goToIdmUrl: idmPaths.goToIdm
  })

const goToSignedIn = (_request, h) => h.redirect(idmPaths.signedIn)

const completeSignIn = async (request, h) => {
  recordTokenExchange(request, idmProvider)

  if (!request.auth.isAuthenticated) {
    request.logger.error(
      {
        err: request.auth.error,
        idmError: request.query.error,
        idmErrorDescription: request.query.error_description,
        state: request.query.state
      },
      'IDM sign-in failed'
    )
    return unableToSignIn(h)
  }

  const { token: accessToken, profile } = request.auth.credentials

  try {
    await verifyToken(profile.idToken, idmProvider)
  } catch (err) {
    request.logger.error({ err }, 'IDM ID token refused')
    return unableToSignIn(h)
  }

  const idTokenClaims = claimsOf(profile.idToken)
  request.yar.set(SIGN_IN_SESSION_KEY, {
    idTokenClaims,
    accessTokenClaims: accessTokenClaimsOf(accessToken, profile.idToken),
    expiresIn: profile.expiresIn,
    scope: profile.scope,
    refreshTokenReturned: profile.refreshTokenReturned
  })
  request.logger.info(
    {
      contactId: idTokenClaims.contactId,
      sessionId: idTokenClaims.sessionId,
      correlationId: idTokenClaims.correlationId
    },
    'IDM sign-in completed'
  )

  return h.redirect(idmPaths.signedIn)
}

const showSignedIn = (request, h) => {
  const signIn = request.yar.get(SIGN_IN_SESSION_KEY)

  if (!signIn) {
    request.logger.info('No IDM sign-in in the session, starting one')
    return h.redirect(idmPaths.signIn)
  }

  return h.view('auth/idm-signed-in', {
    ...base('Signed in'),
    contentColumnClass: SURFACES.display,
    signIn: signInSummaryRows(signIn)
  })
}

const showSignedOut = (_request, h) =>
  h.view('auth/idm-signed-out', base('Signed out'))

const routes = [
  {
    method: 'GET',
    path: idmPaths.signIn,
    options: { auth: false, app: { page: idmSignInPage } },
    handler: showSignIn
  },
  {
    method: 'GET',
    path: idmPaths.goToIdm,
    options: { auth: IDM_STRATEGY },
    handler: goToSignedIn
  },
  {
    method: 'GET',
    path: idmPaths.callback,
    options: {
      auth: { strategy: IDM_STRATEGY, mode: 'try' },
      app: { page: unauthorisedPage }
    },
    handler: completeSignIn
  },
  {
    method: 'GET',
    path: idmPaths.signedIn,
    options: { auth: false, app: { page: idmSignedInPage } },
    handler: showSignedIn
  },
  {
    method: 'GET',
    path: idmPaths.signedOut,
    options: { auth: false, app: { page: idmSignedOutPage } },
    handler: showSignedOut
  }
]

export const idmSignInRoutes = {
  plugin: {
    name: 'idm-sign-in-routes',
    async register(server) {
      if (!providerSetting(idmProvider, 'oidcDiscoveryUrl')) {
        server.logger.info('No IDM discovery URL set, IDM sign-in not served')
        return
      }

      await server.register(idmAuthPlugin)
      server.route(routes)
    }
  }
}
