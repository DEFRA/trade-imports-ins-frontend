import { vi } from 'vitest'
import { getOidcConfigWithRetry } from './get-oidc-config-with-retry.js'
import {
  hiddenIdmSignInProvider,
  serviceSignInProvider
} from './identity-providers.js'

const wreckGetMock = vi.hoisted(() => vi.fn())
const configGetMock = vi.hoisted(() => vi.fn())
const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('../config/config.js', () => ({
  config: { get: configGetMock }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

vi.mock('../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  })
}))

function timedOut() {
  const error = new AggregateError(
    [new Error('connect ETIMEDOUT 127.0.0.1:3007')],
    'ETIMEDOUT'
  )
  error.code = 'ETIMEDOUT'
  return error
}

describe('getOidcConfigWithRetry', () => {
  const discoveryUrl =
    'https://defra-id-stub/idp/.well-known/openid-configuration'
  const payload = { authorization_endpoint: 'https://defra-id-stub/auth' }

  let logger

  beforeEach(() => {
    vi.useFakeTimers()
    wreckGetMock.mockReset()
    configGetMock.mockReset()
    getTraceIdMock.mockReset()

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') return discoveryUrl
      if (key === 'tracing.header') return 'x-cdp-request-id'
      if (key === 'metrics.namespace') return 'trade-imports-ins-frontend'
    })
    getTraceIdMock.mockReturnValue('test-trace-id')

    logger = { warn: vi.fn() }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the discovery document without retrying when the first call succeeds', async () => {
    wreckGetMock.mockResolvedValue({ payload })

    await expect(
      getOidcConfigWithRetry(logger, serviceSignInProvider)
    ).resolves.toEqual(payload)

    expect(wreckGetMock).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('retries after a timeout and returns the document once the provider answers', async () => {
    wreckGetMock
      .mockRejectedValueOnce(timedOut())
      .mockResolvedValueOnce({ payload })

    const result = getOidcConfigWithRetry(logger, serviceSignInProvider)
    let settled = false
    const tracked = result.then((value) => {
      settled = true
      return value
    })

    await vi.advanceTimersByTimeAsync(999)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    await expect(tracked).resolves.toEqual(payload)
    expect(wreckGetMock).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  test('gives up only after the full 1s, 2s and 4s backoff and throws an error naming the discovery URL', async () => {
    wreckGetMock.mockRejectedValue(timedOut())

    const result = getOidcConfigWithRetry(logger, serviceSignInProvider)
    let settled = false
    const tracked = result.catch((error) => {
      settled = true
      return error
    })

    const startMs = Date.now()
    const attemptsAt = async (elapsedMs) => {
      await vi.advanceTimersByTimeAsync(startMs + elapsedMs - Date.now())
      return wreckGetMock.mock.calls.length
    }

    expect(await attemptsAt(999)).toBe(1)
    expect(await attemptsAt(1000)).toBe(2)
    expect(await attemptsAt(2999)).toBe(2)
    expect(await attemptsAt(3000)).toBe(3)
    expect(await attemptsAt(6999)).toBe(3)
    expect(settled).toBe(false)

    expect(await attemptsAt(7000)).toBe(4)
    const error = await tracked

    expect(error.message).toBe(
      `OIDC discovery at ${discoveryUrl} failed after 4 attempts`
    )
    expect(error.cause.code).toBe('ETIMEDOUT')
    expect(logger.warn).toHaveBeenCalledTimes(3)
  })

  test("names the given provider's discovery URL in its retry warnings and final error", async () => {
    const idmDiscoveryUrl =
      'https://idm.example/idphub/b2c/.well-known/openid-configuration'
    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') return discoveryUrl
      if (key === 'idm.oidcDiscoveryUrl') return idmDiscoveryUrl
      if (key === 'tracing.header') return 'x-cdp-request-id'
      if (key === 'metrics.namespace') return 'trade-imports-ins-frontend'
    })
    wreckGetMock.mockRejectedValue(timedOut())

    const tracked = getOidcConfigWithRetry(
      logger,
      hiddenIdmSignInProvider
    ).catch((error) => error)
    await vi.advanceTimersByTimeAsync(7000)
    const error = await tracked

    expect(error.message).toBe(
      `OIDC discovery at ${idmDiscoveryUrl} failed after 4 attempts`
    )
    expect(
      logger.warn.mock.calls.map(([fields]) => fields.discoveryUrl)
    ).toEqual([idmDiscoveryUrl, idmDiscoveryUrl, idmDiscoveryUrl])
  })
})
