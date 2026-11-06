import { vi } from 'vitest'
import { config } from '../config/config.js'
import { getOidcConfig, OIDC_DOCUMENT_TIMEOUT_MS } from './get-oidc-config.js'
import { readEmfDocuments } from '../server/common/test-helpers/emf-documents.js'
import {
  discoveryUrlRequest,
  runAgainstMockOidcDiscoveryUrl,
  serveOidcDiscovery
} from '../server/common/test-helpers/serve-oidc-discovery.js'
import { statusCodes } from '../server/common/constants/status-codes.js'
import {
  setStackDefraIdRewrite,
  STACK_DEFRA_ID_REWRITE_KEYS
} from '../server/common/test-helpers/stack-defra-id-rewrite.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

describe('#getOidcConfig', () => {
  const traceId = 'test-trace-id'
  const servedDocument = {
    authorization_endpoint: 'https://external-host/auth',
    token_endpoint: 'https://internal-host:9443/token',
    jwks_uri: 'https://internal-host:9443/jwks'
  }

  let logSpy

  runAgainstMockOidcDiscoveryUrl({
    restoringConfigKeys: STACK_DEFRA_ID_REWRITE_KEYS
  })

  beforeEach(() => {
    getTraceIdMock.mockReset()
    getTraceIdMock.mockReturnValue(traceId)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  test('Should return the served discovery document', async () => {
    serveOidcDiscovery(servedDocument)

    expect(await getOidcConfig()).toEqual(servedDocument)
  })

  test('Should put the token and key endpoints at the discovery hostname the stack rewrite covers', async () => {
    setStackDefraIdRewrite()
    config.set(
      'defraId.oidcDiscoveryUrl',
      'http://host.docker.internal:3007/idp/.well-known/openid-configuration'
    )
    serveOidcDiscovery({
      ...servedDocument,
      token_endpoint: 'http://localhost:3007/token',
      jwks_uri: 'http://localhost:3007/jwks'
    })

    const result = await getOidcConfig()

    expect(result).toEqual({
      authorization_endpoint: 'https://external-host/auth',
      token_endpoint: 'http://host.docker.internal:3007/token',
      jwks_uri: 'http://host.docker.internal:3007/jwks'
    })
  })

  test('Should measure the discovery call as defra-id openid-configuration', async () => {
    serveOidcDiscovery(servedDocument)

    await getOidcConfig()

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    expect(document.Dependency).toBe('defra-id')
    expect(document.Operation).toBe('openid-configuration')
    expect(document.ExternalCallFailure).toBe(0)
    expect(document.Outcome).toBe('success')
    expect(document).not.toHaveProperty('Interface')
  })

  test('Should send the trace id in the tracing header', async () => {
    const tracingHeader = config.get('tracing.header')
    const scope = discoveryUrlRequest({
      reqheaders: { [tracingHeader]: traceId }
    }).reply(statusCodes.ok, servedDocument)

    await getOidcConfig()

    expect(scope.isDone()).toBe(true)
  })

  test('Should send an empty tracing header when the request has no trace id', async () => {
    getTraceIdMock.mockReturnValue(undefined)
    const tracingHeader = config.get('tracing.header')
    const scope = discoveryUrlRequest({
      reqheaders: { [tracingHeader]: (value) => value === '' }
    }).reply(statusCodes.ok, servedDocument)

    await getOidcConfig()

    expect(scope.isDone()).toBe(true)
  })

  test('Should give up when the discovery reply comes later than the timeout', async () => {
    discoveryUrlRequest()
      .delay(OIDC_DOCUMENT_TIMEOUT_MS + 500)
      .reply(statusCodes.ok, servedDocument)

    await expect(getOidcConfig()).rejects.toMatchObject({
      output: { statusCode: statusCodes.gatewayTimeout }
    })
  })

  test('Should reject and measure a failure when the discovery fetch fails', async () => {
    discoveryUrlRequest().replyWithError('discovery failed')

    await expect(getOidcConfig()).rejects.toThrow('discovery failed')

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    expect(document.ExternalCallFailure).toBe(1)
    expect(document.Outcome).toBe('failure')
  })
})
