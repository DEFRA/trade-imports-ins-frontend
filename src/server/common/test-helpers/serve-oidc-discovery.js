import nock from 'nock'
import { beforeEach } from 'vitest'

import {
  providerSetting,
  providerSettingKey,
  serviceSignInProvider
} from '../../../auth/identity-providers.js'
import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from './mock-oidc-config.js'
import { refuseOutboundHttp } from './real-mode.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

const serviceDiscoveryUrlKey = providerSettingKey(
  serviceSignInProvider,
  'oidcDiscoveryUrl'
)

export const discoveryUrlRequest = ({
  persist = false,
  provider = serviceSignInProvider,
  ...scopeOptions
} = {}) => {
  const discoveryUrl = new URL(providerSetting(provider, 'oidcDiscoveryUrl'))
  const scope = nock(discoveryUrl.origin, scopeOptions)
  return (persist ? scope.persist() : scope).get(discoveryUrl.pathname)
}

export const serveOidcDiscovery = (
  document = mockOidcConfig,
  { provider } = {}
) =>
  discoveryUrlRequest({ persist: true, provider }).reply(
    statusCodes.ok,
    document
  )

export const runAgainstMockOidcDiscoveryUrl = ({
  restoringConfigKeys = []
} = {}) => {
  refuseOutboundHttp()
  restoreConfigAfterEach([serviceDiscoveryUrlKey, ...restoringConfigKeys])

  const mockOidcDiscoveryUrl =
    'https://mock-auth-server/idp/.well-known/openid-configuration'
  beforeEach(() => {
    config.set(serviceDiscoveryUrlKey, mockOidcDiscoveryUrl)
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
