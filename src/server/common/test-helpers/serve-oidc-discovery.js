import nock from 'nock'
import { beforeEach } from 'vitest'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from './mock-oidc-config.js'
import { refuseOutboundHttp } from './real-mode.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

const oidcDiscoveryUrlKey = 'defraId.oidcDiscoveryUrl'

export const discoveryUrlRequest = ({
  persist = false,
  ...scopeOptions
} = {}) => {
  const discoveryUrl = new URL(config.get(oidcDiscoveryUrlKey))
  const scope = nock(discoveryUrl.origin, scopeOptions)
  return (persist ? scope.persist() : scope).get(discoveryUrl.pathname)
}

export const serveOidcDiscovery = (document = mockOidcConfig) =>
  discoveryUrlRequest({ persist: true }).reply(statusCodes.ok, document)

export const runAgainstMockOidcDiscoveryUrl = ({
  restoringConfigKeys = []
} = {}) => {
  refuseOutboundHttp()
  restoreConfigAfterEach([oidcDiscoveryUrlKey, ...restoringConfigKeys])

  const mockOidcDiscoveryUrl =
    'https://mock-auth-server/idp/.well-known/openid-configuration'
  beforeEach(() => {
    config.set(oidcDiscoveryUrlKey, mockOidcDiscoveryUrl)
  })
}

export const runAgainstServedOidcDiscovery = (
  document,
  { restoringConfigKeys } = {}
) => {
  runAgainstMockOidcDiscoveryUrl({ restoringConfigKeys })

  beforeEach(() => {
    serveOidcDiscovery(document)
  })
}
