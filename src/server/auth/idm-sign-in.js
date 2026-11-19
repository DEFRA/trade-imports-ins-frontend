import Jwt from '@hapi/jwt'

import {
  hiddenIdmSignInProvider,
  providerSetting,
  providerSettingKey
} from '../../auth/identity-providers.js'
import { recordTokenExchange } from '../../auth/token-exchange-timer.js'
import { verifyToken } from '../../auth/verify-token.js'
import { renderUnableToSignIn } from './controller.js'
import { getOidcConfigWithRetry } from '../../auth/get-oidc-config-with-retry.js'
import { IDM_STRATEGY, registerIdmStrategy } from '../../plugins/idm-auth.js'
import {
  idmSignInPage,
  idmSignedInPage,
  idmSignedOutPage,
  unauthorisedPage
} from '../app/auth/page.js'
import { base, SURFACES } from '../app/shared/kit.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

export const idmPaths = Object.freeze({
  signIn: '/auth/idm/sign-in',
  goToIdm: '/auth/idm/go-to-defra-id',
  callback: '/auth/callback',
  signedIn: '/auth/idm/signed-in',
  signedOut: '/auth/signed-out'
})

const signInSessionKey = 'idmSignIn'

const claimRows = (claims) =>
  Object.entries(claims).map(([name, value]) => ({
    key: { text: name },
    value: { text: typeof value === 'string' ? value : JSON.stringify(value) }
  }))

function describeSignIn({
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

const unverifiedClaimsOf = (token) => {
  try {
    return claimsOf(token)
  } catch {
    return {}
  }
}

const idmIdsOf = ({ contactId, sessionId, correlationId }) => ({
  contactId,
  sessionId,
  correlationId
})

const decodedAccessTokenClaims = (accessToken, idToken) =>
  accessToken === idToken ? undefined : claimsOf(accessToken)

const refuseSignIn = (request, h, err) => {
  logger.error(
    {
      err,
      idmError: request.query.error,
      idmErrorDescription: request.query.error_description,
      state: request.query.state
    },
    'IDM sign-in failed'
  )
  return renderUnableToSignIn(h, { signInUrl: idmPaths.signIn })
}

const showSignIn = (_request, h) =>
  h.view('auth/idm-sign-in', {
    ...base('Sign in with Defra ID'),
    goToIdmUrl: idmPaths.goToIdm
  })

const goToSignedIn = (_request, h) => h.redirect(idmPaths.signedIn)

const completeSignIn = async (request, h) => {
  recordTokenExchange(request, hiddenIdmSignInProvider)

  if (!request.auth.isAuthenticated) {
    return refuseSignIn(request, h, request.auth.error)
  }

  const { token: accessToken, profile } = request.auth.credentials

  try {
    await verifyToken(profile.idToken, hiddenIdmSignInProvider)
  } catch (err) {
    logger.error(
      {
        err,
        state: request.query.state,
        ...idmIdsOf(unverifiedClaimsOf(profile.idToken))
      },
      'IDM ID token refused'
    )
    return renderUnableToSignIn(h, { signInUrl: idmPaths.signIn })
  }

  const idTokenClaims = claimsOf(profile.idToken)
  request.yar.set(signInSessionKey, {
    idTokenClaims,
    accessTokenClaims: decodedAccessTokenClaims(accessToken, profile.idToken),
    expiresIn: profile.expiresIn,
    scope: profile.scope,
    refreshTokenReturned: profile.refreshTokenReturned
  })
  logger.info(idmIdsOf(idTokenClaims), 'IDM sign-in completed')

  return h.redirect(idmPaths.signedIn)
}

const showSignedIn = (request, h) => {
  const signIn = request.yar.get(signInSessionKey)

  if (!signIn) {
    logger.info('No IDM sign-in in the session, starting one')
    return h.redirect(idmPaths.signIn)
  }

  return h.view('auth/idm-signed-in', {
    ...base('Signed in'),
    contentColumnClass: SURFACES.display,
    signIn: describeSignIn(signIn)
  })
}

const showSignedOut = (request, h) => {
  if (request.query.error) {
    return refuseSignIn(request, h)
  }

  return h.view('auth/idm-signed-out', base('Signed out'))
}

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

const missingIdmClientSettings = () =>
  ['clientId', 'clientSecret', 'serviceId']
    .filter((setting) => !providerSetting(hiddenIdmSignInProvider, setting))
    .map((setting) => providerSettingKey(hiddenIdmSignInProvider, setting))

const discoverIdm = (discoveryUrl) =>
  getOidcConfigWithRetry(logger, hiddenIdmSignInProvider).catch((err) => {
    logger.error(
      { err, discoveryUrl },
      'IDM discovery failed, IDM sign-in not served'
    )
    return null
  })

export const idmSignInRoutes = {
  plugin: {
    name: 'idm-sign-in-routes',
    async register(server) {
      const discoveryUrl = providerSetting(
        hiddenIdmSignInProvider,
        'oidcDiscoveryUrl'
      )
      if (!discoveryUrl) {
        logger.info('No IDM discovery URL set, IDM sign-in not served')
        return
      }

      const missingSettings = missingIdmClientSettings()
      if (missingSettings.length > 0) {
        logger.warn(
          { missingSettings },
          'IDM client settings missing, IDM sign-in not served'
        )
        return
      }

      const oidcConfig = await discoverIdm(discoveryUrl)
      if (!oidcConfig) {
        return
      }

      registerIdmStrategy(server, oidcConfig)
      server.route(routes)
    }
  }
}
