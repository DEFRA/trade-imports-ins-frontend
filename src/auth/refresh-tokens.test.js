import { vi } from 'vitest'
import nock from 'nock'
import { config } from '../config/config.js'
import { refreshTokens, TOKEN_ENDPOINT_TIMEOUT_MS } from './refresh-tokens.js'
import { awaitEmfDocumentForOperation } from '../server/common/test-helpers/emf-documents.js'
import { runAgainstServedOidcDiscovery } from '../server/common/test-helpers/serve-oidc-discovery.js'
import { statusCodes } from '../server/common/constants/status-codes.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

describe('#refreshTokens', () => {
  const traceId = 'test-trace-id'
  const tokenOrigin = 'https://mock-auth-server'
  const tokenPath = '/oauth/token'
  const clientId = 'client-id'
  const clientSecret = 'client-secret'
  const redirectUrl = 'http://localhost/callback'
  const refreshToken = 'REFRESH_TOKEN_123'
  const issuedTokens = {
    access_token: 'NEW_ACCESS',
    refresh_token: 'NEW_REFRESH'
  }

  let logSpy

  runAgainstServedOidcDiscovery(
    { token_endpoint: `${tokenOrigin}${tokenPath}` },
    {
      restoringConfigKeys: [
        'defraId.clientId',
        'defraId.clientSecret',
        'defraId.redirectUrl'
      ]
    }
  )

  const tokenEndpointRequest = ({ body, ...scopeOptions } = {}) =>
    nock(tokenOrigin, scopeOptions).post(tokenPath, body)

  beforeEach(() => {
    getTraceIdMock.mockReset()
    getTraceIdMock.mockReturnValue(traceId)
    config.set('defraId.clientId', clientId)
    config.set('defraId.clientSecret', clientSecret)
    config.set('defraId.redirectUrl', redirectUrl)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  test('Should post the refresh grant to the token endpoint and return the issued tokens', async () => {
    const scope = tokenEndpointRequest({
      reqheaders: {
        'content-type': 'application/x-www-form-urlencoded',
        [config.get('tracing.header')]: traceId
      },
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        scope: `openid offline_access ${clientId}`,
        refresh_token: refreshToken,
        redirect_uri: redirectUrl
      }
    }).reply(statusCodes.ok, issuedTokens)

    const result = await refreshTokens(refreshToken)

    expect(scope.isDone()).toBe(true)
    expect(result).toEqual(issuedTokens)
  })

  test('Should send an empty tracing header when the request has no trace id', async () => {
    getTraceIdMock.mockReturnValue(undefined)
    const scope = tokenEndpointRequest({
      reqheaders: { [config.get('tracing.header')]: (value) => value === '' }
    }).reply(statusCodes.ok, issuedTokens)

    await refreshTokens(refreshToken)

    expect(scope.isDone()).toBe(true)
  })

  test('Should measure the refresh as defra-id token-refresh', async () => {
    tokenEndpointRequest().reply(statusCodes.ok, issuedTokens)

    await refreshTokens(refreshToken)

    const document = await awaitEmfDocumentForOperation(logSpy, 'token-refresh')
    expect(document.Dependency).toBe('defra-id')
    expect(document.Interface).toBe('SYN-13')
    expect(document.ExternalCallFailure).toBe(0)
  })

  test('Should reject and measure a failure when the token endpoint fails', async () => {
    tokenEndpointRequest().replyWithError('post failed')

    await expect(refreshTokens(refreshToken)).rejects.toThrow('post failed')

    const document = await awaitEmfDocumentForOperation(logSpy, 'token-refresh')
    expect(document.Interface).toBe('SYN-13')
    expect(document.ExternalCallFailure).toBe(1)
    expect(document.Outcome).toBe('failure')
  })

  test('Should give up when the token endpoint reply comes later than the timeout', async () => {
    tokenEndpointRequest()
      .delay(TOKEN_ENDPOINT_TIMEOUT_MS + 500)
      .reply(statusCodes.ok, issuedTokens)

    await expect(refreshTokens(refreshToken)).rejects.toMatchObject({
      output: { statusCode: statusCodes.gatewayTimeout }
    })
  })
})
