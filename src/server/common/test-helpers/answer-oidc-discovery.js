import nock from 'nock'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from './mock-oidc-config.js'

export const answerOidcDiscovery = () => {
  const discoveryUrl = new URL(config.get('defraId.oidcDiscoveryUrl'))
  nock(discoveryUrl.origin)
    .get(discoveryUrl.pathname)
    .reply(statusCodes.ok, mockOidcConfig)
}
