import nock from 'nock'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from './mock-oidc-config.js'

export const serveOidcDiscovery = (document = mockOidcConfig) => {
  const discoveryUrl = new URL(config.get('defraId.oidcDiscoveryUrl'))
  return nock(discoveryUrl.origin)
    .persist()
    .get(discoveryUrl.pathname)
    .reply(statusCodes.ok, document)
}
