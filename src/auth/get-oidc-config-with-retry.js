import { getOidcConfig } from './get-oidc-config.js'
import { defraIdProvider, providerSetting } from './identity-providers.js'

const SECOND_MS = 1000
const RETRY_DELAYS_MS = [SECOND_MS, 2 * SECOND_MS, 4 * SECOND_MS]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getOidcConfigWithRetry(logger, provider = defraIdProvider) {
  const discoveryUrl = providerSetting(provider, 'oidcDiscoveryUrl')

  for (let attempt = 1; ; attempt++) {
    try {
      return await getOidcConfig(provider)
    } catch (err) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1]
      if (delayMs === undefined) {
        throw new Error(
          `OIDC discovery at ${discoveryUrl} failed after ${attempt} attempts`,
          { cause: err }
        )
      }
      logger.warn(
        { err, discoveryUrl, attempt },
        'OIDC discovery failed, retrying'
      )
      await wait(delayMs)
    }
  }
}

export { getOidcConfigWithRetry }
