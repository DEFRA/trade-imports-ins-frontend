import { bellOptionsFor } from '../auth/bell-options.js'
import { hiddenIdmSignInProvider } from '../auth/identity-providers.js'

export const IDM_STRATEGY = 'idm'

export const registerIdmStrategy = (server, oidcConfig) =>
  server.auth.strategy(
    IDM_STRATEGY,
    'bell',
    bellOptionsFor(hiddenIdmSignInProvider, oidcConfig, {
      name: IDM_STRATEGY,
      profile(credentials, params) {
        credentials.profile = {
          idToken: params.id_token,
          expiresIn: params.expires_in,
          scope: params.scope,
          refreshTokenReturned: Boolean(params.refresh_token)
        }
      }
    })
  )
