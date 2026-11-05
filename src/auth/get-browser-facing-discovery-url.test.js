import { config } from '../config/config.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import { getBrowserFacingDiscoveryUrl } from './get-browser-facing-discovery-url.js'

const DISCOVERY_PATH = '/idphub/b2c/.well-known/openid-configuration'

describe('getBrowserFacingDiscoveryUrl', () => {
  restoreConfigAfterEach([
    'defraId.oidcDiscoveryUrl',
    'defraId.browserFacingHostnameRewrite.enabled'
  ])

  test('rewrites a listed Docker hostname to the configured target, keeping the port', () => {
    config.set('defraId.browserFacingHostnameRewrite.enabled', true)
    config.set(
      'defraId.oidcDiscoveryUrl',
      `http://host.docker.internal:3007${DISCOVERY_PATH}`
    )

    expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
      `http://localhost:3007${DISCOVERY_PATH}`
    )
  })

  test('leaves the URL unchanged when the rewrite is disabled', () => {
    config.set('defraId.browserFacingHostnameRewrite.enabled', false)
    config.set(
      'defraId.oidcDiscoveryUrl',
      `http://host.docker.internal:3007${DISCOVERY_PATH}`
    )

    expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
      `http://host.docker.internal:3007${DISCOVERY_PATH}`
    )
  })

  test('leaves an unlisted hostname unchanged', () => {
    config.set('defraId.browserFacingHostnameRewrite.enabled', true)
    config.set(
      'defraId.oidcDiscoveryUrl',
      `https://defra-id.example.test${DISCOVERY_PATH}`
    )

    expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
      `https://defra-id.example.test${DISCOVERY_PATH}`
    )
  })
})
