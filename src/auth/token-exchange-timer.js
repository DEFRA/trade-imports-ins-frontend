import { recordExternalCallInBackground } from '../server/common/helpers/external-call-metrics.js'
import { defraIdProvider } from './identity-providers.js'

const STARTED_AT = 'defraIdTokenExchangeStartedAt'

/**
 * Stamps the start of the token exchange when Bell looks up the token endpoint.
 *
 * @param {string} tokenEndpoint - the identity provider's token endpoint
 * @returns {(request: object) => string} a `provider.token` function that stamps the start and returns the endpoint
 */
export const timeTokenExchange = (tokenEndpoint) => (request) => {
  request.app[STARTED_AT] = performance.now()
  return tokenEndpoint
}

/**
 * Records the token exchange Bell made for this request.
 *
 * @param {object} request - the sign-in callback request
 * @param {{ calls: { tokenExchange: object } }} [provider] - the identity provider Bell exchanged the code with, `defraIdProvider` by default
 */
export const recordTokenExchange = (request, provider = defraIdProvider) => {
  const startedAt = request.app?.[STARTED_AT]
  if (startedAt === undefined) {
    return
  }
  recordExternalCallInBackground(provider.calls.tokenExchange, {
    durationMs: performance.now() - startedAt,
    failed: !request.auth.isAuthenticated
  })
}
