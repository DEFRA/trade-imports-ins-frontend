import { config } from '../config/config.js'
import { getBrowserFacingDiscoveryUrl } from './get-browser-facing-discovery-url.js'

async function getSignOutUrl(_request, _token) {
  const oidcBaseUrl = getBrowserFacingDiscoveryUrl()
  const basePath = oidcBaseUrl.pathname.replace(
    '/.well-known/openid-configuration',
    ''
  )
  const signOutUrl = new URL(`${oidcBaseUrl.origin}${basePath}/signout`)
  signOutUrl.searchParams.set(
    'post_logout_redirect_uri',
    config.get('defraId.signOutRedirectUrl')
  )
  return signOutUrl.toString()
}

export { getSignOutUrl }
