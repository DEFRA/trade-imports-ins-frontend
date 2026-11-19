import {
  hiddenIdmSignInProvider,
  providerSetting
} from '../auth/identity-providers.js'
import { timeTokenExchange } from '../auth/token-exchange-timer.js'
import { config } from '../config/config.js'

export const IDM_STRATEGY = 'idm'

function getIdmBellOptions(oidcConfig) {
  const clientId = providerSetting(hiddenIdmSignInProvider, 'clientId')

  return {
    provider: {
      name: IDM_STRATEGY,
      protocol: 'oauth2',
      useParamsAuth: true,
      auth: oidcConfig.authorization_endpoint,
      token: timeTokenExchange(oidcConfig.token_endpoint),
      scope: ['openid', 'offline_access', clientId],
      profile(credentials, params) {
        credentials.profile = {
          idToken: params.id_token,
          expiresIn: params.expires_in,
          scope: params.scope,
          refreshTokenReturned: Boolean(params.refresh_token)
        }
      }
    },
    clientId,
    clientSecret: providerSetting(hiddenIdmSignInProvider, 'clientSecret'),
    password: config.get('session.cookie.password'),
    isSecure: config.get('isProduction'),
    isSameSite: config.get('session.cookie.sameSite'),
    location: () => providerSetting(hiddenIdmSignInProvider, 'redirectUrl'),
    providerParams: {
      serviceId: providerSetting(hiddenIdmSignInProvider, 'serviceId'),
      p: providerSetting(hiddenIdmSignInProvider, 'policy'),
      response_mode: 'query'
    }
  }
}

export const registerIdmStrategy = (server, oidcConfig) =>
  server.auth.strategy(IDM_STRATEGY, 'bell', getIdmBellOptions(oidcConfig))
