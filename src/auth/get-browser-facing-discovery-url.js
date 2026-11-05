import { config } from '../config/config.js'

/**
 * The Defra ID OIDC discovery URL as a browser reaches it: the configured
 * discovery URL, with its hostname rewritten when the rewrite is enabled and
 * lists that hostname.
 *
 * @returns {URL}
 */
function getBrowserFacingDiscoveryUrl() {
  const discoveryUrl = new URL(config.get('defraId.oidcDiscoveryUrl'))
  const rewriteEnabled = config.get(
    'defraId.browserFacingHostnameRewrite.enabled'
  )
  const rewriteHosts = new Set(
    config.get('defraId.browserFacingHostnameRewrite.from')
  )

  if (rewriteEnabled && rewriteHosts.has(discoveryUrl.hostname)) {
    discoveryUrl.hostname = config.get(
      'defraId.browserFacingHostnameRewrite.to'
    )
  }
  return discoveryUrl
}

export { getBrowserFacingDiscoveryUrl }
