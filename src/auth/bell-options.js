import { config } from '../config/config.js'
import { providerSetting } from './identity-providers.js'
import { timeTokenExchange } from './token-exchange-timer.js'

/**
 * The Bell OAuth options for signing in through an identity provider.
 *
 * @param {{ configKey: string }} provider - the identity provider the strategy signs in through
 * @param {{ authorization_endpoint: string, token_endpoint: string }} oidcConfig - the provider's discovery document
 * @param {object} strategy - what differs between the strategies
 * @param {string} strategy.name - the Bell provider name
 * @param {(credentials: object, params: object) => void} strategy.profile - sets `credentials.profile` from the token response
 * @param {(request: object) => void} [strategy.rememberRedirect] - runs before Bell sends the browser to the provider
 * @param {(request: object) => object} [strategy.extraProviderParams] - query parameters added to the provider's authorize request
 * @returns {object} the options for `server.auth.strategy(name, 'bell', options)`
 */
export const bellOptionsFor = (
  provider,
  oidcConfig,
  { name, profile, rememberRedirect, extraProviderParams }
) => {
  const clientId = providerSetting(provider, 'clientId')

  return {
    provider: {
      name,
      protocol: 'oauth2',
      useParamsAuth: true,
      auth: oidcConfig.authorization_endpoint,
      token: timeTokenExchange(oidcConfig.token_endpoint),
      scope: ['openid', 'offline_access', clientId],
      profile
    },
    clientId,
    clientSecret: providerSetting(provider, 'clientSecret'),
    password: config.get('session.cookie.password'),
    isSecure: config.get('isProduction'),
    isSameSite: config.get('session.cookie.sameSite'),
    location(request) {
      rememberRedirect?.(request)
      return providerSetting(provider, 'redirectUrl')
    },
    providerParams: (request) => ({
      serviceId: providerSetting(provider, 'serviceId'),
      p: providerSetting(provider, 'policy'),
      response_mode: 'query',
      ...extraProviderParams?.(request)
    })
  }
}
