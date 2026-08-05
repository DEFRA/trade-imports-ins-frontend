import nock from 'nock'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { countriesClient } from './countries-client.js'

vi.mock('#/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsReferenceDataApi.baseUrl') {
        return 'http://localhost:8088'
      }
      if (key === 'tracing.header') {
        return 'x-cdp-request-id'
      }
      return undefined
    })
  }
}))

vi.mock('#/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: vi.fn() })
}))

describe('#countriesClient', () => {
  const traceId = 'trace-123'

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  test('GETs countries with trace header and parses JSON', async () => {
    const scope = nock('http://localhost:8088')
      .get('/countries')
      .matchHeader('x-cdp-request-id', traceId)
      .reply(200, [{ code: 'GB', name: 'United Kingdom' }])

    const result = await countriesClient.getCountries(traceId)

    expect(result).toEqual([{ code: 'GB', name: 'United Kingdom' }])
    expect(scope.isDone()).toBe(true)
  })

  test('forwards blocks query params', async () => {
    const scope = nock('http://localhost:8088')
      .get('/countries')
      .query({ blocks: 'country' })
      .reply(200, [])

    await countriesClient.getCountries(traceId, ['country'])

    expect(scope.isDone()).toBe(true)
  })

  test('throws with status when reference data returns an error', async () => {
    nock('http://localhost:8088').get('/countries').reply(503)

    await expect(countriesClient.getCountries(traceId)).rejects.toMatchObject({
      message: 'Failed to get countries',
      status: 503
    })
  })
})
