import { vi } from 'vitest'
import { config } from '../config/config.js'
import {
  generateSigningKey,
  signToken
} from '../server/common/test-helpers/signing-key.js'
import { verifyToken } from './verify-token.js'
import {
  hiddenIdmSignInProvider,
  serviceSignInProvider
} from './identity-providers.js'
import { OIDC_DOCUMENT_TIMEOUT_MS } from './get-oidc-config.js'
import { statusCodes } from '../server/common/constants/status-codes.js'
import { awaitEmfDocumentForOperation } from '../server/common/test-helpers/emf-documents.js'
import {
  applyIdmSettings,
  idmDiscoveryDocument,
  idmSettingKeys,
  idmSettings
} from '../server/common/test-helpers/idm-sign-in-settings.js'
import {
  keysRequest,
  runAgainstServedOidcDiscovery,
  serveOidcDiscovery
} from '../server/common/test-helpers/serve-oidc-discovery.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

describe('#verifyToken', () => {
  const traceId = 'test-trace-id'
  const serviceDiscoveryDocument = {
    jwks_uri: 'https://mock-auth-server/jwks',
    issuer: 'https://mock-auth-server'
  }
  const signingKey = generateSigningKey('signing-key')
  const otherKey = generateSigningKey('other-key')

  let logSpy

  runAgainstServedOidcDiscovery(serviceDiscoveryDocument, {
    restoringConfigKeys: ['defraId.clientId', ...idmSettingKeys]
  })

  const tokenSignedWith = (
    signingKeyToUse,
    {
      headerKid,
      aud = config.get('defraId.clientId'),
      iss = serviceDiscoveryDocument.issuer
    } = {}
  ) => signToken(signingKeyToUse, { aud, iss, sub: 'user-1' }, { headerKid })

  const serveKeys = (keys) =>
    keysRequest(serviceDiscoveryDocument).reply(statusCodes.ok, { keys })

  const idmTokenSignedWith = (
    signingKeyToUse,
    { aud = idmSettings.clientId, iss = idmDiscoveryDocument.issuer } = {}
  ) => signToken(signingKeyToUse, { aud, iss, sub: 'user-1' })

  const serveIdmKeys = (keys) =>
    keysRequest(idmDiscoveryDocument).reply(statusCodes.ok, { keys })

  beforeEach(() => {
    getTraceIdMock.mockReset()
    getTraceIdMock.mockReturnValue(traceId)
    config.set('defraId.clientId', 'test-client-id')
    applyIdmSettings()
    serveOidcDiscovery(idmDiscoveryDocument, {
      provider: hiddenIdmSignInProvider
    })
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  describe('valid', () => {
    test('Should resolve for a token signed by the served key', async () => {
      serveKeys([signingKey.publicJwk])

      await expect(
        verifyToken(tokenSignedWith(signingKey), serviceSignInProvider)
      ).resolves.toBeUndefined()
    })

    test('Should resolve for a token signed by the served key its header names, when another key is served first', async () => {
      serveKeys([otherKey.publicJwk, signingKey.publicJwk])

      await expect(
        verifyToken(tokenSignedWith(signingKey), serviceSignInProvider)
      ).resolves.toBeUndefined()
    })

    test('Should resolve for a token issued to the IDM client when checked against IDM, and measure the key fetch as idm jwks', async () => {
      serveIdmKeys([signingKey.publicJwk])

      await expect(
        verifyToken(idmTokenSignedWith(signingKey), hiddenIdmSignInProvider)
      ).resolves.toBeUndefined()

      const document = await awaitEmfDocumentForOperation(logSpy, 'jwks')
      expect(document.Dependency).toBe('idm')
    })

    test('Should resolve for a token issued to any client by any issuer when checked against Defra ID', async () => {
      serveKeys([signingKey.publicJwk])

      await expect(
        verifyToken(
          tokenSignedWith(signingKey, {
            aud: 'another-client',
            iss: 'https://another-issuer'
          }),
          serviceSignInProvider
        )
      ).resolves.toBeUndefined()
    })

    test('Should send the trace id in the tracing header of the key request', async () => {
      const scope = keysRequest(serviceDiscoveryDocument, {
        reqheaders: { [config.get('tracing.header')]: traceId }
      }).reply(statusCodes.ok, { keys: [signingKey.publicJwk] })

      await verifyToken(tokenSignedWith(signingKey), serviceSignInProvider)

      expect(scope.isDone()).toBe(true)
    })

    test('Should send an empty tracing header when the request has no trace id', async () => {
      getTraceIdMock.mockReturnValue(undefined)
      const scope = keysRequest(serviceDiscoveryDocument, {
        reqheaders: { [config.get('tracing.header')]: (value) => value === '' }
      }).reply(statusCodes.ok, { keys: [signingKey.publicJwk] })

      await verifyToken(tokenSignedWith(signingKey), serviceSignInProvider)

      expect(scope.isDone()).toBe(true)
    })

    test('Should measure the key fetch as defra-id jwks', async () => {
      serveKeys([signingKey.publicJwk])

      await verifyToken(tokenSignedWith(signingKey), serviceSignInProvider)

      const document = await awaitEmfDocumentForOperation(logSpy, 'jwks')
      expect(document.Dependency).toBe('defra-id')
      expect(document.Interface).toBe('SYN-12')
      expect(document.ExternalCallFailure).toBe(0)
    })
  })

  describe('invalid', () => {
    test('Should reject a token whose header names a served key it was not signed by', async () => {
      serveKeys([signingKey.publicJwk])

      await expect(
        verifyToken(
          tokenSignedWith(otherKey, { headerKid: signingKey.kid }),
          serviceSignInProvider
        )
      ).rejects.toThrow('Invalid token signature')
    })

    test('Should reject a token whose header names a key that is not served', async () => {
      serveKeys([signingKey.publicJwk])

      await expect(
        verifyToken(tokenSignedWith(otherKey), serviceSignInProvider)
      ).rejects.toThrow('No signing key other-key served')
    })

    test('Should reject when the served key set is empty', async () => {
      serveKeys([])

      await expect(
        verifyToken(tokenSignedWith(signingKey), serviceSignInProvider)
      ).rejects.toThrow('No signing key signing-key served')
    })

    test('Should reject a token issued to another client when checked against IDM', async () => {
      serveIdmKeys([signingKey.publicJwk])

      await expect(
        verifyToken(
          idmTokenSignedWith(signingKey, { aud: 'another-client' }),
          hiddenIdmSignInProvider
        )
      ).rejects.toThrow('Token audience is not allowed')
    })

    test('Should reject a token from another issuer when checked against IDM', async () => {
      serveIdmKeys([signingKey.publicJwk])

      await expect(
        verifyToken(
          idmTokenSignedWith(signingKey, { iss: 'https://another-issuer' }),
          hiddenIdmSignInProvider
        )
      ).rejects.toThrow('Token payload iss value not allowed')
    })

    test('Should reject and measure a failure when the key fetch fails', async () => {
      keysRequest(serviceDiscoveryDocument).replyWithError('jwks fetch failed')

      await expect(
        verifyToken(tokenSignedWith(signingKey), serviceSignInProvider)
      ).rejects.toThrow('jwks fetch failed')

      const document = await awaitEmfDocumentForOperation(logSpy, 'jwks')
      expect(document.Interface).toBe('SYN-12')
      expect(document.ExternalCallFailure).toBe(1)
      expect(document.Outcome).toBe('failure')
    })

    test('Should give up when the key reply comes later than the timeout', async () => {
      keysRequest(serviceDiscoveryDocument)
        .delay(OIDC_DOCUMENT_TIMEOUT_MS + 500)
        .reply(statusCodes.ok, { keys: [signingKey.publicJwk] })

      await expect(
        verifyToken(tokenSignedWith(signingKey), serviceSignInProvider)
      ).rejects.toMatchObject({
        output: { statusCode: statusCodes.gatewayTimeout }
      })
    })
  })
})
