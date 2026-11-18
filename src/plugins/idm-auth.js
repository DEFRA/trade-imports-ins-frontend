import { getOidcConfigWithRetry } from '../auth/get-oidc-config-with-retry.js'
import { idmProvider, providerSetting } from '../auth/identity-providers.js'
import { timeTokenExchange } from '../auth/token-exchange-timer.js'
import { config } from '../config/config.js'

export const IDM_STRATEGY = 'idm'

function getIdmBellOptions(oidcConfig) {
  const clientId = providerSetting(idmProvider, 'clientId')

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
    clientSecret: providerSetting(idmProvider, 'clientSecret'),
    password: config.get('session.cookie.password'),
    isSecure: config.get('isProduction'),
    isSameSite: config.get('session.cookie.sameSite'),
    location: () => providerSetting(idmProvider, 'redirectUrl'),
    providerParams: {
      serviceId: providerSetting(idmProvider, 'serviceId'),
      p: providerSetting(idmProvider, 'policy'),
      response_mode: 'query'
    }
  }
}

export const idmAuthPlugin = {
  plugin: {
    name: 'idm-auth',
    async register(server) {
      const oidcConfig = await getOidcConfigWithRetry(
        server.logger,
        idmProvider
      )
      server.auth.strategy(IDM_STRATEGY, 'bell', getIdmBellOptions(oidcConfig))
    }
  }
}
