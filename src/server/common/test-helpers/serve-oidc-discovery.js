import nock from 'nock'
import { beforeEach } from 'vitest'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from './mock-oidc-config.js'
import { refuseOutboundHttp } from './real-mode.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

const oidcDiscoveryUrlKey = 'defraId.oidcDiscoveryUrl'

export const idmOidcDiscoveryUrlKey = 'idm.oidcDiscoveryUrl'

export const discoveryUrlRequest = ({
  persist = false,
  discoveryUrlKey = oidcDiscoveryUrlKey,
  ...scopeOptions
} = {}) => {
  const discoveryUrl = new URL(config.get(discoveryUrlKey))
  const scope = nock(discoveryUrl.origin, scopeOptions)
  return (persist ? scope.persist() : scope).get(discoveryUrl.pathname)
}

export const serveOidcDiscovery = (
  document = mockOidcConfig,
  { discoveryUrlKey } = {}
) =>
  discoveryUrlRequest({ persist: true, discoveryUrlKey }).reply(
    statusCodes.ok,
    document
  )

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
