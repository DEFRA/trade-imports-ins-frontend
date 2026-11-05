import nock from 'nock'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from './mock-oidc-config.js'

export const discoveryUrlRequest = ({
  persist = false,
  ...scopeOptions
} = {}) => {
  const discoveryUrl = new URL(config.get('defraId.oidcDiscoveryUrl'))
  const scope = nock(discoveryUrl.origin, scopeOptions)
  return (persist ? scope.persist() : scope).get(discoveryUrl.pathname)
}

export const serveOidcDiscovery = (document = mockOidcConfig) =>
  discoveryUrlRequest({ persist: true }).reply(statusCodes.ok, document)
