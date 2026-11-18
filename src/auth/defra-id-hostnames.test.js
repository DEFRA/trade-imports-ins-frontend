import { config } from '../config/config.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import {
  setStackDefraIdRewrite,
  STACK_DEFRA_ID_REWRITE_KEYS
} from '../server/common/test-helpers/stack-defra-id-rewrite.js'
import {
  getBrowserFacingDiscoveryUrl,
  withServerSideEndpointsAtDiscoveryHostname
} from './defra-id-hostnames.js'

const DISCOVERY_PATH = '/idphub/b2c/.well-known/openid-configuration'

const discoveryUrlAt = (origin) => `${origin}${DISCOVERY_PATH}`

const configureDiscovery = (origin) =>
  config.set('defraId.oidcDiscoveryUrl', discoveryUrlAt(origin))

describe('#defraIdHostnames', () => {
  restoreConfigAfterEach([
    'defraId.oidcDiscoveryUrl',
    ...STACK_DEFRA_ID_REWRITE_KEYS
  ])

  describe('getBrowserFacingDiscoveryUrl', () => {
    test('Should rewrite a listed Docker hostname to the configured target, keeping the port', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://host.docker.internal:3007')

      expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
        `http://localhost:3007${DISCOVERY_PATH}`
      )
    })

    test('Should leave the URL unchanged when the rewrite is disabled', () => {
      setStackDefraIdRewrite()
      config.set('defraId.browserFacingHostnameRewrite.enabled', false)
      configureDiscovery('http://host.docker.internal:3007')

      expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
        `http://host.docker.internal:3007${DISCOVERY_PATH}`
      )
    })

    test('Should leave an unlisted hostname unchanged', () => {
      setStackDefraIdRewrite()
      configureDiscovery('https://defra-id.example.test')

      expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
        `https://defra-id.example.test${DISCOVERY_PATH}`
      )
    })
  })

  describe('withServerSideEndpointsAtDiscoveryHostname', () => {
    const servedDocument = {
      authorization_endpoint: 'http://localhost:3007/idphub/authorize',
      token_endpoint: 'http://localhost:3008/idphub/token',
      jwks_uri: 'https://localhost:3009/idphub/keys?kid=one'
    }

    test('Should put token_endpoint and jwks_uri at the stack discovery hostname, keeping ports and paths', () => {
      setStackDefraIdRewrite()

      const result = withServerSideEndpointsAtDiscoveryHostname(
        servedDocument,
        discoveryUrlAt('http://host.docker.internal:3007')
      )

      expect(result).toEqual({
        authorization_endpoint: 'http://localhost:3007/idphub/authorize',
        token_endpoint: 'http://host.docker.internal:3008/idphub/token',
        jwks_uri: 'https://host.docker.internal:3009/idphub/keys?kid=one'
      })
    })

    test('Should put token_endpoint and jwks_uri at localhost when discovery is at the rewrite target', () => {
      setStackDefraIdRewrite()

      const result = withServerSideEndpointsAtDiscoveryHostname(
        {
          ...servedDocument,
          token_endpoint: 'http://host.docker.internal:3008/idphub/token',
          jwks_uri: 'http://host.docker.internal:3009/idphub/keys'
        },
        discoveryUrlAt('http://localhost:3007')
      )

      expect(result).toEqual({
        authorization_endpoint: 'http://localhost:3007/idphub/authorize',
        token_endpoint: 'http://localhost:3008/idphub/token',
        jwks_uri: 'http://localhost:3009/idphub/keys'
      })
    })

    test('Should return the document exactly as served when the rewrite is disabled', () => {
      setStackDefraIdRewrite()
      config.set('defraId.browserFacingHostnameRewrite.enabled', false)

      expect(
        withServerSideEndpointsAtDiscoveryHostname(
          servedDocument,
          discoveryUrlAt('http://host.docker.internal:3007')
        )
      ).toEqual(servedDocument)
    })

    test('Should return the document exactly as served when the discovery hostname is unlisted', () => {
      setStackDefraIdRewrite()

      expect(
        withServerSideEndpointsAtDiscoveryHostname(
          servedDocument,
          discoveryUrlAt('https://defra-id.example.test')
        )
      ).toEqual(servedDocument)
    })

    test('Should return the document exactly as served when fetched from an unlisted hostname while the configured Defra ID discovery hostname is listed', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://host.docker.internal:3007')

      expect(
        withServerSideEndpointsAtDiscoveryHostname(
          servedDocument,
          discoveryUrlAt('https://defra-id.example.test')
        )
      ).toEqual(servedDocument)
    })

    test('Should return a document without the endpoint keys exactly as served', () => {
      setStackDefraIdRewrite()
      const withoutEndpoints = {
        authorization_endpoint: 'http://localhost:3007/idphub/authorize'
      }

      expect(
        withServerSideEndpointsAtDiscoveryHostname(
          withoutEndpoints,
          discoveryUrlAt('http://host.docker.internal:3007')
        )
      ).toEqual(withoutEndpoints)
    })

    test('Should keep endpoint values that are not strings exactly as served', () => {
      setStackDefraIdRewrite()
      const notStrings = { token_endpoint: null, jwks_uri: 12345 }

      expect(
        withServerSideEndpointsAtDiscoveryHostname(
          notStrings,
          discoveryUrlAt('http://host.docker.internal:3007')
        )
      ).toEqual(notStrings)
    })

    test('Should leave the document it was given unchanged', () => {
      setStackDefraIdRewrite()
      const given = { ...servedDocument }

      withServerSideEndpointsAtDiscoveryHostname(
        given,
        discoveryUrlAt('http://host.docker.internal:3007')
      )

      expect(given).toEqual(servedDocument)
    })
  })
})
